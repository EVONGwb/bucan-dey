import base64
import json
from datetime import datetime, timezone

from bson import ObjectId

from app.core.database import get_database
from app.models.notification import build_notification_document
from app.schemas.notification import NotificationOut


def serialize_notification(notification: dict) -> dict:
    return {
        "id": str(notification["_id"]),
        "user_id": notification["user_id"],
        "actor_id": notification["actor_id"],
        "actor_snapshot": notification["actor_snapshot"],
        "type": notification["type"],
        "title": notification["title"],
        "body": notification["body"],
        "entity_type": notification["entity_type"],
        "entity_id": notification["entity_id"],
        "is_read": notification.get("is_read", False),
        "created_at": notification["created_at"],
    }


def to_notification_out(notification: dict) -> NotificationOut:
    return NotificationOut(**serialize_notification(notification))


def encode_cursor(notification: dict) -> str:
    raw = {
        "created_at": notification["created_at"].isoformat(),
        "id": str(notification["_id"]),
    }
    return base64.urlsafe_b64encode(json.dumps(raw).encode()).decode()


def decode_cursor(cursor: str | None) -> tuple[datetime, ObjectId] | None:
    if not cursor:
        return None

    try:
        raw = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        created_at = datetime.fromisoformat(raw["created_at"])
        if created_at.tzinfo is not None:
            created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
        return created_at, ObjectId(raw["id"])
    except (ValueError, KeyError, TypeError):
        return None


async def create_notification(
    *,
    user_id: str,
    actor: dict,
    type: str,
    title: str,
    body: str,
    entity_type: str,
    entity_id: str,
    dedupe: bool = False,
    skip_self: bool = True,
) -> dict | None:
    actor_id = str(actor["_id"])
    if skip_self and user_id == actor_id:
        return None

    db = get_database()

    if dedupe:
        existing = await db.notifications.find_one(
            {
                "user_id": user_id,
                "actor_id": actor_id,
                "type": type,
                "entity_type": entity_type,
                "entity_id": entity_id,
            }
        )
        if existing:
            return existing

    document = build_notification_document(
        user_id=user_id,
        actor=actor,
        type=type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    result = await db.notifications.insert_one(document)
    notification = await db.notifications.find_one({"_id": result.inserted_id})
    if notification:
        await emit_notification(notification)
        try:
            from app.services.push import send_push_for_notification

            await send_push_for_notification(notification)
        except Exception:
            pass
    return notification


async def list_notifications(user_id: str, limit: int, cursor: str | None = None) -> tuple[list[dict], str | None]:
    db = get_database()
    query = {"user_id": user_id}
    cursor_data = decode_cursor(cursor)

    if cursor_data:
        cursor_created_at, cursor_id = cursor_data
        query["$or"] = [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "_id": {"$lt": cursor_id}},
        ]

    fetch_limit = min(max(limit, 1), 50)
    notifications = await (
        db.notifications.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit + 1)
        .to_list(fetch_limit + 1)
    )

    next_cursor = None
    if len(notifications) > fetch_limit:
        next_cursor = encode_cursor(notifications[fetch_limit - 1])
        notifications = notifications[:fetch_limit]

    return notifications, next_cursor


async def unread_count(user_id: str) -> int:
    db = get_database()
    return await db.notifications.count_documents({"user_id": user_id, "is_read": False})


async def emit_unread_count(user_id: str) -> None:
    from app.core.realtime import realtime_manager

    await realtime_manager.send_to_user(
        user_id,
        "unread_count_update",
        {"unread_count": await unread_count(user_id)},
    )


async def emit_notification(notification: dict) -> None:
    from app.core.realtime import realtime_manager

    user_id = notification["user_id"]
    await realtime_manager.send_to_user(
        user_id,
        "notification",
        serialize_notification(notification),
    )
    await emit_unread_count(user_id)


async def mark_notification_read(notification_id: str, user_id: str) -> bool:
    if not ObjectId.is_valid(notification_id):
        return False

    db = get_database()
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"is_read": True}},
    )
    if result.matched_count > 0:
        await emit_unread_count(user_id)
    return result.matched_count > 0


async def mark_all_read(user_id: str) -> int:
    db = get_database()
    result = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )
    if result.modified_count > 0:
        await emit_unread_count(user_id)
    return result.modified_count
