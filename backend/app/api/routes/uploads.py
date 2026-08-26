"""Upload endpoints for S3 presigned URLs and media registration."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_builder
from app.core.database import get_db
from app.core.uploads import get_public_url, generate_presigned_upload
from app.models import BuilderUser, MediaAsset, MediaType, Project
from app.schemas import MediaAssetRead
from app.schemas.uploads import MediaRegisterRequest, PresignedUploadRequest, PresignedUploadResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presign", response_model=PresignedUploadResponse)
def presign_upload(
    payload: PresignedUploadRequest,
    builder: BuilderUser = Depends(get_current_builder),
):
    """Get a presigned S3 URL for direct file upload.

    Client uploads directly to S3 without the file touching our server.
    """
    try:
        result = generate_presigned_upload(
            content_type=payload.content_type,
            filename=payload.filename,
            project_id=payload.project_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return result


@router.post("/register", response_model=MediaAssetRead, status_code=status.HTTP_201_CREATED)
def register_upload(
    payload: MediaRegisterRequest,
    db: Session = Depends(get_db),
    builder: BuilderUser = Depends(get_current_builder),
):
    """Register an uploaded file as a media asset on a project.

    Call this after the client has successfully uploaded to the presigned URL.
    """
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    if project.builder_id != builder.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your project")

    try:
        media_type = MediaType(payload.media_type)
    except ValueError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid media_type. Use: {[t.value for t in MediaType]}",
        )

    url = get_public_url(payload.file_key)
    asset = MediaAsset(
        project_id=payload.project_id,
        media_type=media_type,
        title=payload.title,
        url=url,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset
