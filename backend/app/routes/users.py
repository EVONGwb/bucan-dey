from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_optional_current_user
from app.schemas.post import PostOut
from app.schemas.user import UserOut
from app.services.posts import add_like_flags, get_profile_posts, serialize_post
from app.services.users import get_user_by_username, serialize_user

router = APIRouter()


@router.get("/{username}", response_model=UserOut)
async def get_user_profile(username: str) -> UserOut:
    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return UserOut(**serialize_user(user))


@router.get("/{username}/posts", response_model=list[PostOut])
async def get_user_posts_endpoint(
    username: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> list[PostOut]:
    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    posts = await get_profile_posts(username, current_user)
    posts_with_likes = await add_like_flags(posts, current_user)
    return [
        PostOut(**serialize_post(post, liked_by_me=liked_by_me))
        for post, liked_by_me in posts_with_likes
    ]
