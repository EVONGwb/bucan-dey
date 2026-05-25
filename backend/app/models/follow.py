from datetime import datetime, timezone


def build_follow_document(*, follower_id: str, following_id: str) -> dict:
    return {
        "follower_id": follower_id,
        "following_id": following_id,
        "created_at": datetime.now(timezone.utc),
    }
