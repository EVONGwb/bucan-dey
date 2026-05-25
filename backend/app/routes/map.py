from fastapi import APIRouter, Query

from app.schemas.map import AmbientResponse, MapPostsResponse
from app.schemas.post import PostType
from app.services.map import get_ambient_zones, get_map_posts, to_map_post_out


router = APIRouter()


@router.get("/posts", response_model=MapPostsResponse)
async def get_map_posts_endpoint(
    city: str | None = None,
    type: PostType | None = None,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, ge=0.1, le=50),
    limit: int = Query(default=100, ge=1, le=200),
) -> MapPostsResponse:
    posts = await get_map_posts(
        city=city,
        post_type=type,
        limit=limit,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
    )
    return MapPostsResponse(items=[to_map_post_out(post) for post in posts])


@router.get("/nearby", response_model=MapPostsResponse)
async def get_nearby_posts_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=5, ge=0.1, le=50),
    type: PostType | None = None,
    limit: int = Query(default=100, ge=1, le=200),
) -> MapPostsResponse:
    posts = await get_map_posts(
        post_type=type,
        limit=limit,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
    )
    return MapPostsResponse(items=[to_map_post_out(post) for post in posts])


@router.get("/ambient", response_model=AmbientResponse)
async def get_ambient_endpoint() -> AmbientResponse:
    return AmbientResponse(zones=await get_ambient_zones())
