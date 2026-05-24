from datetime import datetime, timezone

from app.models.post import build_author_snapshot


def build_comment_document(post_id: str, author: dict, text: str) -> dict:
    now = datetime.now(timezone.utc)

    return {
        "post_id": post_id,
        "author_id": str(author["_id"]),
        "author_snapshot": build_author_snapshot(author),
        "text": text,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
