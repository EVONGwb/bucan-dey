from datetime import datetime, timezone

from app.models.event import normalize_event_location
from app.models.post import build_author_snapshot


def build_live_document(payload: dict, creator: dict, room_id: str) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "creator_id": str(creator["_id"]),
        "creator_snapshot": build_author_snapshot(creator),
        "title": payload["title"],
        "description": payload.get("description", ""),
        "category": payload.get("category", "ambiente"),
        "thumbnail_url": payload.get("thumbnail_url"),
        "provider": payload.get("provider", "livekit"),
        "room_id": room_id,
        "stream_key": payload.get("stream_key"),
        "playback_url": payload.get("playback_url"),
        "is_live": True,
        "started_at": now,
        "ended_at": None,
        "ended_reason": None,
        "location": normalize_event_location(payload.get("location") or {}),
        "viewers_count": 0,
        "peak_viewers": 0,
        "max_duration_minutes": payload.get("max_duration_minutes") or 120,
        "total_watch_time_seconds": 0,
        "total_unique_viewers": 0,
        "bitrate_mode": payload.get("bitrate_mode", "auto"),
        "moderation_status": "active",
        "reports_count": 0,
        "last_heartbeat_at": now,
        "visibility": payload.get("visibility", "public"),
        "created_at": now,
        "updated_at": now,
    }
