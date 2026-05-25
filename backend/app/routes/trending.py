from fastapi import APIRouter, Depends

from app.core.security import get_optional_current_user
from app.schemas.trending import (
    TrendingPlacesResponse,
    TrendingPostsResponse,
    TrendingUsersResponse,
)
from app.services.trending import trending_places, trending_posts, trending_users

router = APIRouter()


@router.get("/posts", response_model=TrendingPostsResponse)
async def get_trending_posts(
    limit: int = 20,
    current_user: dict | None = Depends(get_optional_current_user),
) -> TrendingPostsResponse:
    return TrendingPostsResponse(items=await trending_posts(current_user, limit=limit))


@router.get("/users", response_model=TrendingUsersResponse)
async def get_trending_users(
    limit: int = 20,
    current_user: dict | None = Depends(get_optional_current_user),
) -> TrendingUsersResponse:
    return TrendingUsersResponse(items=await trending_users(current_user, limit=limit))


@router.get("/places", response_model=TrendingPlacesResponse)
async def get_trending_places(limit: int = 20) -> TrendingPlacesResponse:
    return TrendingPlacesResponse(places=await trending_places(limit=limit))
