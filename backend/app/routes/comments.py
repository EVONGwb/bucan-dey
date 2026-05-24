from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_active_user
from app.services.interactions import get_comment_by_id, soft_delete_comment


router = APIRouter()


@router.delete("/{comment_id}")
async def delete_comment_endpoint(
    comment_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    comment = await get_comment_by_id(comment_id)

    if comment is None or comment.get("is_deleted"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )

    is_author = comment.get("author_id") == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"

    if not is_author and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    await soft_delete_comment(comment)
    return {"message": "Comment deleted"}
