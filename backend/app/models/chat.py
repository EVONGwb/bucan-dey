from datetime import datetime, timezone


def build_participant_snapshot(user: dict) -> dict:
    return {
        "user_id": str(user["_id"]),
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "city": user.get("city", ""),
    }


def build_sender_snapshot(user: dict) -> dict:
    return {
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
    }


def build_conversation_document(user_a: dict, user_b: dict) -> dict:
    now = datetime.now(timezone.utc)
    participant_ids = sorted([str(user_a["_id"]), str(user_b["_id"])])
    snapshots = [build_participant_snapshot(user_a), build_participant_snapshot(user_b)]
    snapshots.sort(key=lambda snapshot: participant_ids.index(snapshot["user_id"]))

    return {
        "participant_ids": participant_ids,
        "conversation_key": ":".join(participant_ids),
        "participant_snapshots": snapshots,
        "last_message": None,
        "last_message_at": now,
        "created_at": now,
        "updated_at": now,
    }


def build_message_document(conversation_id: str, sender: dict, text: str) -> dict:
    now = datetime.now(timezone.utc)

    return {
        "conversation_id": conversation_id,
        "sender_id": str(sender["_id"]),
        "sender_snapshot": build_sender_snapshot(sender),
        "text": text,
        "media_url": None,
        "read_by": [str(sender["_id"])],
        "is_deleted": False,
        "created_at": now,
    }
