from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    content_type: str = Field(
        description="MIME type of the file",
        examples=["image/jpeg", "model/gltf-binary"],
    )
    filename: str = Field(
        min_length=1,
        max_length=255,
        description="Original filename",
    )
    project_id: int = Field(description="Project this file belongs to")


class PresignedUploadResponse(BaseModel):
    upload_url: str = Field(description="Presigned URL to PUT the file to")
    file_key: str = Field(description="S3 object key")
    headers: dict = Field(description="Required HTTP headers for the upload")


class MediaRegisterRequest(BaseModel):
    project_id: int
    media_type: str = Field(description="model_3d | floor_plan | photo | capture_360 | ar_pack | interior_set")
    title: str = ""
    file_key: str = Field(description="S3 key returned from the presigned upload")
