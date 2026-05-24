from fastapi import HTTPException, UploadFile, status

import cloudinary
import cloudinary.uploader

from app.core.config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_VIDEO_SIZE = 100 * 1024 * 1024


def configure_cloudinary() -> None:
    if not all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured.",
        )

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def detect_media_type(content_type: str | None) -> str:
    if content_type in ALLOWED_IMAGE_TYPES:
        return "image"
    if content_type in ALLOWED_VIDEO_TYPES:
        return "video"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only JPEG, PNG, WEBP, MP4, MOV and WEBM files are allowed.",
    )


async def validate_media_file(file: UploadFile) -> tuple[bytes, str]:
    media_type = detect_media_type(file.content_type)
    content = await file.read()
    size = len(content)

    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    max_size = MAX_IMAGE_SIZE if media_type == "image" else MAX_VIDEO_SIZE
    if size > max_size:
        limit_mb = 10 if media_type == "image" else 100
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{media_type.capitalize()} files must be {limit_mb} MB or less.",
        )

    return content, media_type


def build_video_thumbnail(public_id: str) -> str:
    return cloudinary.CloudinaryVideo(public_id).build_url(
        resource_type="video",
        format="jpg",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )


async def upload_media(file: UploadFile, current_user: dict) -> dict:
    content, media_type = await validate_media_file(file)
    configure_cloudinary()
    folder = f"{settings.CLOUDINARY_UPLOAD_FOLDER}/{current_user['username']}"

    try:
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type=media_type,
            public_id=None,
            overwrite=False,
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary upload failed.",
        ) from exc

    public_id = result["public_id"]
    thumbnail_url = result.get("secure_url")
    if media_type == "video":
        thumbnail_url = build_video_thumbnail(public_id)

    return {
        "url": result["secure_url"],
        "type": media_type,
        "thumbnail_url": thumbnail_url,
        "public_id": public_id,
    }
