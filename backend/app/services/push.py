import asyncio
import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from pywebpush import WebPushException, webpush

from app.core.config import settings
from app.core.database import get_database
from app.models.push import build_push_subscription_document
from app.schemas.push import PushSubscriptionIn


def get_vapid_public_key() -> str:
    return settings.VAPID_PUBLIC_KEY


def _vapid_private_key() -> str:
    return settings.VAPID_PRIVATE_KEY.strip()


def _vapid_claims() -> dict[str, str]:
    return {"sub": settings.VAPID_SUBJECT}


def _notification_payload(notification: dict) -> dict:
    url = "/notifications"
    if notification.get("entity_type") == "event" and notification.get("entity_id"):
        url = f"/events/{notification['entity_id']}"
    elif notification.get("entity_type") == "post" and notification.get("entity_id"):
        url = f"/posts/{notification['entity_id']}"
    elif notification.get("entity_type") in {"conversation", "message"} and notification.get("entity_id"):
        url = f"/chat?conversation={notification['entity_id']}"

    return {
        "title": notification.get("title", "BUCAN DEY"),
        "body": notification.get("body", "Tienes una nueva notificacion."),
        "url": url,
        "type": notification.get("type", "notification"),
    }


async def upsert_subscription(
    *,
    user_id: str,
    payload: PushSubscriptionIn,
    user_agent: str | None = None,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    document = build_push_subscription_document(
        user_id=user_id,
        endpoint=payload.endpoint,
        keys=payload.keys.model_dump(),
        user_agent=user_agent,
    )
    update = {
        "$set": {
            "user_id": document["user_id"],
            "keys": document["keys"],
            "user_agent": document["user_agent"],
            "is_active": True,
            "updated_at": now,
        },
        "$setOnInsert": {"created_at": now},
    }
    await db.push_subscriptions.update_one(
        {"endpoint": payload.endpoint},
        update,
        upsert=True,
    )
    return await db.push_subscriptions.find_one({"endpoint": payload.endpoint})


async def unsubscribe_subscription(user_id: str, endpoint: str) -> bool:
    db = get_database()
    result = await db.push_subscriptions.update_one(
        {"user_id": user_id, "endpoint": endpoint},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return result.matched_count > 0


async def _send_webpush(subscription: dict, payload: dict) -> bool:
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        return False

    subscription_info = {
        "endpoint": subscription["endpoint"],
        "keys": subscription["keys"],
    }

    try:
        await asyncio.to_thread(
            webpush,
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=_vapid_private_key(),
            vapid_claims=_vapid_claims(),
            ttl=60 * 60 * 24,
            timeout=10,
        )
        return True
    except WebPushException as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code in {404, 410}:
            db = get_database()
            await db.push_subscriptions.update_one(
                {"_id": subscription["_id"]},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
        return False
    except Exception:
        return False


async def send_push_to_user(user_id: str, payload: dict) -> int:
    db = get_database()
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id, "is_active": True}
    ).to_list(25)

    sent = 0
    for subscription in subscriptions:
        if await _send_webpush(subscription, payload):
            sent += 1

    return sent


async def send_push_for_notification(notification: dict) -> int:
    return await send_push_to_user(
        notification["user_id"],
        _notification_payload(notification),
    )


async def send_test_push(user_id: str) -> int:
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured.",
        )

    return await send_push_to_user(
        user_id,
        {
            "title": "BUCAN DEY",
            "body": "Las notificaciones push estan activas.",
            "url": "/notifications",
            "type": "test",
        },
    )
