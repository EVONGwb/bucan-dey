from datetime import datetime, timezone


def build_push_subscription_document(
    *,
    user_id: str,
    endpoint: str,
    keys: dict,
    user_agent: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "endpoint": endpoint,
        "keys": {
            "p256dh": keys["p256dh"],
            "auth": keys["auth"],
        },
        "user_agent": user_agent or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
