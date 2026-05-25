from datetime import datetime, timedelta, timezone
from typing import Literal

from app.models.post import build_author_snapshot, normalize_location


StoryVisibility = Literal["global", "followers"]


def build_story_document(payload: dict, author: dict) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "author_id": str(author["_id"]),
        "author_snapshot": build_author_snapshot(author),
        "media": payload["media"],
        "text": payload.get("text", ""),
        "visibility": payload.get("visibility", "global"),
        "location": normalize_location(payload.get("location") or {}),
        "views_count": 0,
        "viewers": [],
        "expires_at": now + timedelta(hours=24),
        "created_at": now,
    }
