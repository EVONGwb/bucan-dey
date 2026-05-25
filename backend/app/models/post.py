from datetime import datetime, timezone
from typing import Literal


PostType = Literal[
    "normal",
    "video",
    "fiesta",
    "cumpleaños",
    "evento",
    "live",
    "bar",
    "ambiente",
]
PostVisibility = Literal["global", "profile_only", "private"]
MediaType = Literal["image", "video"]


def build_author_snapshot(user: dict) -> dict:
    return {
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "city": user.get("city", ""),
    }


def build_post_document(payload: dict, author: dict) -> dict:
    now = datetime.now(timezone.utc)
    location = normalize_location(payload.get("location") or {})

    return {
        "author_id": str(author["_id"]),
        "author_snapshot": build_author_snapshot(author),
        "type": payload.get("type", "normal"),
        "visibility": payload.get("visibility", "global"),
        "text": payload.get("text", ""),
        "media": payload.get("media", []),
        "location": location,
        "event_data": payload.get("event_data"),
        "live_data": payload.get("live_data"),
        "stats": {
            "likes_count": 0,
            "comments_count": 0,
            "views_count": 0,
            "reposts_count": 0,
            "shares_count": 0,
        },
        "is_deleted": False,
        "is_hidden": False,
        "created_at": now,
        "updated_at": now,
    }


def normalize_location(location: dict) -> dict:
    if not location.get("show_on_map"):
        location["lat"] = None
        location["lng"] = None
        location.pop("geo", None)
        return location

    lat = location.get("lat")
    lng = location.get("lng")

    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        location["geo"] = {
            "type": "Point",
            "coordinates": [float(lng), float(lat)],
        }
    else:
        location.pop("geo", None)

    return location
