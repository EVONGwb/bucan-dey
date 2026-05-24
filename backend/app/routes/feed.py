from fastapi import APIRouter, Depends, Query

from app.core.security import get_optional_current_user
from app.schemas.post import FeedResponse
from app.services.posts import add_like_flags, get_global_feed, serialize_post


router = APIRouter()


@router.get("/global", response_model=FeedResponse)
async def get_global_feed_endpoint(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = None,
    current_user: dict | None = Depends(get_optional_current_user),
) -> FeedResponse:
    posts, next_cursor = await get_global_feed(limit=limit, cursor=cursor)
    posts_with_likes = await add_like_flags(posts, current_user)
    return FeedResponse(
        items=[
            serialize_post(post, liked_by_me=liked_by_me)
            for post, liked_by_me in posts_with_likes
        ],
        next_cursor=next_cursor,
    )
