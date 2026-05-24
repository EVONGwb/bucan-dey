from datetime import datetime, timezone


def build_actor_snapshot(actor: dict) -> dict:
    return {
        "username": actor["username"],
        "display_name": actor["display_name"],
        "avatar_url": actor.get("avatar_url"),
        "city": actor.get("city", ""),
    }


def build_notification_document(
    *,
    user_id: str,
    actor: dict,
    type: str,
    title: str,
    body: str,
    entity_type: str,
    entity_id: str,
) -> dict:
    return {
        "user_id": user_id,
        "actor_id": str(actor["_id"]),
        "actor_snapshot": build_actor_snapshot(actor),
        "type": type,
        "title": title,
        "body": body,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    }
