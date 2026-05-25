from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_optional_current_user, require_active_user
from app.schemas.post import PostOut
from app.schemas.user import FollowListResponse, FollowResponse, UserOnboardingUpdate, UserOut
from app.services.follows import (
    follow_user,
    is_following_user,
    list_followers,
    list_following,
    suggested_users,
    unfollow_user,
)
from app.services.posts import add_like_flags, get_profile_posts, serialize_post
from app.services.users import (
    complete_user_onboarding,
    get_user_by_id,
    get_user_by_username,
    serialize_user,
)

router = APIRouter()


@router.patch("/me/onboarding", response_model=UserOut)
async def complete_onboarding(
    payload: UserOnboardingUpdate,
    current_user: dict = Depends(require_active_user),
) -> UserOut:
    try:
        user = await complete_user_onboarding(current_user, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None

    return UserOut(**serialize_user(user))


@router.get("/suggested", response_model=FollowListResponse)
async def get_suggested_users(
    limit: int = 20,
    current_user: dict | None = Depends(get_optional_current_user),
) -> FollowListResponse:
    items = await suggested_users(current_user, limit=limit)
    return FollowListResponse(items=items, next_cursor=None)


@router.post("/{user_id}/follow", response_model=FollowResponse)
async def follow_user_endpoint(
    user_id: str,
    current_user: dict = Depends(require_active_user),
) -> FollowResponse:
    target_user = await get_user_by_id(user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    try:
        result = await follow_user(current_user, target_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    return FollowResponse(**result)


@router.delete("/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user_endpoint(
    user_id: str,
    current_user: dict = Depends(require_active_user),
) -> FollowResponse:
    target_user = await get_user_by_id(user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    try:
        result = await unfollow_user(current_user, target_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    return FollowResponse(**result)


@router.get("/{username}", response_model=UserOut)
async def get_user_profile(
    username: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> UserOut:
    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    is_following = False
    if current_user is not None and str(current_user["_id"]) != str(user["_id"]):
        is_following = await is_following_user(str(current_user["_id"]), str(user["_id"]))

    return UserOut(**serialize_user(user, is_following=is_following))


@router.get("/{username}/followers", response_model=FollowListResponse)
async def get_followers_endpoint(
    username: str,
    limit: int = 30,
    cursor: str | None = None,
    current_user: dict | None = Depends(get_optional_current_user),
) -> FollowListResponse:
    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    items, next_cursor = await list_followers(user, current_user, limit=limit, cursor=cursor)
    return FollowListResponse(items=items, next_cursor=next_cursor)


@router.get("/{username}/following", response_model=FollowListResponse)
async def get_following_endpoint(
    username: str,
    limit: int = 30,
    cursor: str | None = None,
    current_user: dict | None = Depends(get_optional_current_user),
) -> FollowListResponse:
    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    items, next_cursor = await list_following(user, current_user, limit=limit, cursor=cursor)
    return FollowListResponse(items=items, next_cursor=next_cursor)


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
