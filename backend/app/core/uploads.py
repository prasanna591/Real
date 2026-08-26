"""S3 presigned URL service for direct client uploads.

Clients upload directly to S3 without touching our server.
Flow: Client → POST /uploads/presign → get presigned URL → PUT to S3 → POST /media
"""

import uuid
from datetime import timedelta

import boto3
from botocore.config import Config

from app.core.config import get_settings

# Allowed file types and their MIME types
ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "model/gltf-binary": "glb",
    "model/gltf+json": "gltf",
    "application/octet-stream": "bin",
    "video/mp4": "mp4",
}

MAX_FILE_SIZE_MB = 100


def _get_s3_client():
    settings = get_settings()
    kwargs = {"region_name": "us-east-1"}
    if settings.s3_endpoint_url:
        kwargs["endpoint_url"] = settings.s3_endpoint_url
    if settings.aws_access_key_id:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", config=Config(signature_version="s3v4"), **kwargs)


def generate_presigned_upload(
    content_type: str,
    filename: str,
    project_id: int,
) -> dict:
    """Generate a presigned PUT URL for direct S3 upload.

    Returns:
        {
            "upload_url": "https://s3...?...",
            "file_key": "projects/123/uuid.glb",
            "headers": {"Content-Type": "...", "x-amz-acl": "public-read"}
        }
    """
    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"Content type '{content_type}' not allowed. Use: {', '.join(ALLOWED_TYPES.keys())}")

    ext = ALLOWED_TYPES[content_type]
    file_key = f"projects/{project_id}/{uuid.uuid4().hex}.{ext}"

    s3 = _get_s3_client()
    settings = get_settings()

    presigned_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": file_key,
            "ContentType": content_type,
            "ACL": "public-read",
        },
        ExpiresIn=timedelta(minutes=15).total_seconds(),
    )

    return {
        "upload_url": presigned_url,
        "file_key": file_key,
        "headers": {
            "Content-Type": content_type,
            "x-amz-acl": "public-read",
        },
    }


def get_public_url(file_key: str) -> str:
    """Get the public URL for a file in S3."""
    settings = get_settings()
    if settings.s3_endpoint_url:
        return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{file_key}"
    return f"https://{settings.s3_bucket}.s3.amazonaws.com/{file_key}"
