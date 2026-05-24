from fastapi import APIRouter, Depends, File, UploadFile

from app.core.security import require_active_user
from app.schemas.media import MediaUploadOut
from app.services.media import upload_media


router = APIRouter()


@router.post("/upload", response_model=MediaUploadOut)
async def upload_media_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_active_user),
) -> MediaUploadOut:
    media = await upload_media(file, current_user)
    return MediaUploadOut(**media)
