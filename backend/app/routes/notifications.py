from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_active_user
from app.schemas.notification import NotificationsResponse, UnreadCountResponse
from app.services.notifications import (
    list_notifications,
    mark_all_read,
    mark_notification_read,
    to_notification_out,
    unread_count,
)


router = APIRouter()


@router.get("", response_model=NotificationsResponse)
async def get_notifications_endpoint(
    limit: int = Query(default=30, ge=1, le=50),
    cursor: str | None = None,
    current_user: dict = Depends(require_active_user),
) -> NotificationsResponse:
    notifications, next_cursor = await list_notifications(
        str(current_user["_id"]),
        limit,
        cursor,
    )
    return NotificationsResponse(
        items=[to_notification_out(notification) for notification in notifications],
        next_cursor=next_cursor,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count_endpoint(
    current_user: dict = Depends(require_active_user),
) -> UnreadCountResponse:
    return UnreadCountResponse(unread_count=await unread_count(str(current_user["_id"])))


@router.patch("/{notification_id}/read")
async def mark_notification_read_endpoint(
    notification_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    updated = await mark_notification_read(notification_id, str(current_user["_id"]))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    return {"message": "Notification marked as read"}


@router.patch("/read-all")
async def mark_all_read_endpoint(
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    await mark_all_read(str(current_user["_id"]))
    return {"message": "All notifications marked as read"}
