from datetime import datetime, timezone


def build_repost_document(*, user_id: str, post_id: str) -> dict:
    return {
        "user_id": user_id,
        "post_id": post_id,
        "created_at": datetime.now(timezone.utc),
    }
