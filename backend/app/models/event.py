from datetime import datetime, timezone

from app.models.post import build_author_snapshot


def build_creator_snapshot(user: dict) -> dict:
    return {
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "city": user.get("city", ""),
    }


def normalize_event_location(location: dict) -> dict:
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


def build_event_document(payload: dict, creator: dict) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "creator_id": str(creator["_id"]),
        "creator_snapshot": build_creator_snapshot(creator),
        "title": payload["title"],
        "description": payload.get("description", ""),
        "category": payload.get("category", "evento"),
        "cover_media": payload.get("cover_media"),
        "location": normalize_event_location(payload.get("location") or {}),
        "start_at": payload["start_at"],
        "end_at": payload.get("end_at"),
        "visibility": payload.get("visibility", "public"),
        "attendees_count": 0,
        "interested_count": 0,
        "shares_count": 0,
        "is_featured": False,
        "is_cancelled": False,
        "created_at": now,
        "updated_at": now,
    }


def build_event_attendee_document(event_id: str, user_id: str, status: str) -> dict:
    return {
        "event_id": event_id,
        "user_id": user_id,
        "status": status,
        "created_at": datetime.now(timezone.utc),
    }


def build_event_post_payload(event: dict) -> dict:
    location = event.get("location") or {}
    return {
        "type": "evento",
        "visibility": "global",
        "text": f"{event['title']}\n\n{event.get('description', '')}".strip(),
        "media": [event["cover_media"]] if event.get("cover_media") else [],
        "location": {
            "city": location.get("city", ""),
            "area": location.get("area", ""),
            "lat": location.get("lat"),
            "lng": location.get("lng"),
            "show_on_map": isinstance(location.get("lat"), (int, float))
            and isinstance(location.get("lng"), (int, float)),
        },
        "event_data": {
            "title": event["title"],
            "start_at": event["start_at"],
            "end_at": event.get("end_at"),
            "venue": location.get("venue_name", ""),
            "price": "",
            "is_open": True,
        },
        "live_data": None,
        "source_event_id": str(event["_id"]),
    }
