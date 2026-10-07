"""S3 presigned URL service for direct client uploads.

Clients upload directly to S3 without touching our server.
Flow: Client → POST /uploads/presign → get presigned URL → PUT to S3 → POST /media
"""

import uuid
from datetime import timedelta
from pathlib import Path

import boto3
from botocore.config import Config
from fastapi import UploadFile

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

# Content types we accept for local disk uploads, mapped to allowed extensions.
LOCAL_UPLOAD_TYPES = {
    "image/jpeg": (".jpg", ".jpeg"),
    "image/png": (".png",),
    "image/webp": (".webp",),
    "model/gltf-binary": (".glb",),
    "model/gltf+json": (".gltf",),
    "video/mp4": (".mp4",),
}

IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def read_upload(file: UploadFile, max_size_mb: int = MAX_FILE_SIZE_MB) -> bytes:
    """Read an uploaded file in chunks, rejecting files larger than `max_size_mb`.

    Raises ValueError when the declared size is exceeded, so unbounded files are
    never buffered into memory.
    """
    max_bytes = max_size_mb * 1024 * 1024
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise ValueError(f"File exceeds the {max_size_mb} MB upload limit")
        chunks.append(chunk)
    return b"".join(chunks)


def validate_upload(content_type: str | None, filename: str | None) -> str:
    """Validate an upload's content type against its file extension.

    Returns the canonical extension (with leading dot). Raises ValueError when the
    content type is disallowed or the extension doesn't match it.
    """
    if not content_type:
        raise ValueError("Missing content type")
    allowed_exts = LOCAL_UPLOAD_TYPES.get(content_type)
    if allowed_exts is None:
        raise ValueError(f"Unsupported content type: {content_type}")
    ext = Path(filename or "").suffix.lower()
    if ext in allowed_exts:
        return ext
    raise ValueError(f"File type not allowed for {content_type}. Use: {', '.join(sorted(allowed_exts))}")


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
