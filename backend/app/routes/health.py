from fastapi import APIRouter

from app.services.system import get_health_status


router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    return await get_health_status()
