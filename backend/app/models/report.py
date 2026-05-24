from datetime import datetime, timezone


def build_reporter_snapshot(user: dict) -> dict:
    return {
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "city": user.get("city", ""),
    }


def build_report_document(
    *,
    reporter: dict,
    target_type: str,
    target_id: str,
    reason: str,
    details: str = "",
) -> dict:
    now = datetime.now(timezone.utc)

    return {
        "reporter_id": str(reporter["_id"]),
        "reporter_snapshot": build_reporter_snapshot(reporter),
        "target_type": target_type,
        "target_id": target_id,
        "reason": reason,
        "details": details,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
