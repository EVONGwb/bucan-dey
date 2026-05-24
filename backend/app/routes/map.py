from fastapi import APIRouter, Query

from app.schemas.map import AmbientResponse, MapPostsResponse
from app.schemas.post import PostType
from app.services.map import get_ambient_zones, get_map_posts, to_map_post_out


router = APIRouter()


@router.get("/posts", response_model=MapPostsResponse)
async def get_map_posts_endpoint(
    city: str | None = None,
    type: PostType | None = None,
    limit: int = Query(default=100, ge=1, le=200),
) -> MapPostsResponse:
    posts = await get_map_posts(city=city, post_type=type, limit=limit)
    return MapPostsResponse(items=[to_map_post_out(post) for post in posts])


@router.get("/ambient", response_model=AmbientResponse)
async def get_ambient_endpoint() -> AmbientResponse:
    return AmbientResponse(zones=await get_ambient_zones())
