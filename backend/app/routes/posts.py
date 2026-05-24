from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_optional_current_user, require_active_user
from app.schemas.post import PostCreate, PostOut, PostUpdate
from app.schemas.comment import CommentCreate, CommentOut, CommentsResponse, LikeResponse
from app.services.interactions import (
    add_like,
    create_comment,
    get_comments,
    remove_like,
    to_comment_out,
)
from app.services.posts import (
    create_post,
    get_post_by_id,
    soft_delete_post,
    update_post,
    to_post_out,
)

router = APIRouter()


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post_endpoint(
    payload: PostCreate,
    current_user: dict = Depends(require_active_user),
) -> PostOut:
    post = await create_post(payload, current_user)
    return await to_post_out(post, current_user)


@router.get("/{post_id}", response_model=PostOut)
async def get_post_endpoint(
    post_id: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> PostOut:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    is_global = post.get("visibility") == "global"
    is_owner = current_user is not None and post.get("author_id") == str(current_user["_id"])

    if not is_global and not is_owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    return await to_post_out(post, current_user)


@router.patch("/{post_id}", response_model=PostOut)
async def update_post_endpoint(
    post_id: str,
    payload: PostUpdate,
    current_user: dict = Depends(require_active_user),
) -> PostOut:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    if post.get("author_id") != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    updated_post = await update_post(post, payload)
    return await to_post_out(updated_post, current_user)


@router.delete("/{post_id}")
async def delete_post_endpoint(
    post_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    is_owner = post.get("author_id") == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"

    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    await soft_delete_post(post)
    return {"message": "Post deleted"}


@router.post("/{post_id}/like", response_model=LikeResponse)
async def like_post_endpoint(
    post_id: str,
    current_user: dict = Depends(require_active_user),
) -> LikeResponse:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    return LikeResponse(**await add_like(post, current_user))


@router.delete("/{post_id}/like", response_model=LikeResponse)
async def unlike_post_endpoint(
    post_id: str,
    current_user: dict = Depends(require_active_user),
) -> LikeResponse:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    return LikeResponse(**await remove_like(post, current_user))


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment_endpoint(
    post_id: str,
    payload: CommentCreate,
    current_user: dict = Depends(require_active_user),
) -> CommentOut:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    comment = await create_comment(post, current_user, payload.text)
    return to_comment_out(comment)


@router.get("/{post_id}/comments", response_model=CommentsResponse)
async def get_comments_endpoint(
    post_id: str,
    limit: int = 20,
    cursor: str | None = None,
) -> CommentsResponse:
    post = await get_post_by_id(post_id)

    if post is None or post.get("is_deleted") or post.get("is_hidden"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    comments, next_cursor = await get_comments(post_id, limit, cursor)
    return CommentsResponse(
        items=[to_comment_out(comment) for comment in comments],
        next_cursor=next_cursor,
    )
