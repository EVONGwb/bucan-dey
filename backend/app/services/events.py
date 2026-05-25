import math
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.event import (
    build_event_attendee_document,
    build_event_document,
    build_event_post_payload,
    normalize_event_location,
)
from app.models.post import build_post_document
from app.schemas.event import EventCreate, EventOut, EventUpdate


def _dump(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return value


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def serialize_event(event: dict, my_attendance_status: str | None = None) -> dict:
    return {
        "id": str(event["_id"]),
        "creator_id": event["creator_id"],
        "creator_snapshot": event["creator_snapshot"],
        "title": event["title"],
        "description": event.get("description", ""),
        "category": event.get("category", "evento"),
        "cover_media": event.get("cover_media"),
        "location": event.get("location") or {},
        "start_at": event["start_at"],
        "end_at": event.get("end_at"),
        "visibility": event.get("visibility", "public"),
        "attendees_count": max(0, int(event.get("attendees_count", 0))),
        "interested_count": max(0, int(event.get("interested_count", 0))),
        "shares_count": max(0, int(event.get("shares_count", 0))),
        "is_featured": bool(event.get("is_featured", False)),
        "is_cancelled": bool(event.get("is_cancelled", False)),
        "my_attendance_status": my_attendance_status,
        "distance_km": round(float(event["distance_km"]), 1) if event.get("distance_km") is not None else None,
        "created_at": event["created_at"],
        "updated_at": event["updated_at"],
    }


async def get_visible_creator_ids(viewer: dict | None) -> list[str]:
    if viewer is None:
        return []

    db = get_database()
    follows = await db.follows.find(
        {"follower_id": str(viewer["_id"])},
        {"following_id": 1},
    ).to_list(500)
    return [follow["following_id"] for follow in follows]


def visibility_query(viewer: dict | None, following_ids: list[str] | None = None) -> dict:
    if viewer is None:
        return {"visibility": "public"}

    viewer_id = str(viewer["_id"])
    return {
        "$or": [
            {"visibility": "public"},
            {"creator_id": viewer_id},
            {"visibility": "followers", "creator_id": {"$in": following_ids or []}},
        ]
    }


async def can_view_event(event: dict, viewer: dict | None) -> bool:
    if event.get("is_cancelled"):
        return False
    if event.get("visibility") == "public":
        return True
    if viewer is None:
        return False
    if event.get("creator_id") == str(viewer["_id"]):
        return True

    from app.services.follows import is_following_user

    return await is_following_user(str(viewer["_id"]), event["creator_id"])


async def create_event(payload: EventCreate, creator: dict) -> dict:
    db = get_database()
    event_doc = build_event_document(
        {
            "title": payload.title,
            "description": payload.description,
            "category": payload.category,
            "cover_media": _dump(payload.cover_media),
            "location": _dump(payload.location),
            "start_at": payload.start_at,
            "end_at": payload.end_at,
            "visibility": payload.visibility,
        },
        creator,
    )
    result = await db.events.insert_one(event_doc)
    event = await db.events.find_one({"_id": result.inserted_id})
    if event is None:
        raise RuntimeError("Event was created but could not be loaded.")

    if event.get("visibility") == "public":
        post_payload = build_event_post_payload(event)
        post_doc = build_post_document(post_payload, creator)
        post_doc["source_event_id"] = str(event["_id"])
        await db.posts.insert_one(post_doc)

    return event


async def get_event_by_id(event_id: str) -> dict | None:
    if not ObjectId.is_valid(event_id):
        return None

    db = get_database()
    return await db.events.find_one({"_id": ObjectId(event_id)})


async def list_events(
    *,
    viewer: dict | None = None,
    category: str | None = None,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    featured: bool | None = None,
    upcoming: bool = True,
    limit: int = 40,
) -> list[dict]:
    db = get_database()
    following_ids = await get_visible_creator_ids(viewer)
    query: dict[str, Any] = {"is_cancelled": False, **visibility_query(viewer, following_ids)}

    if category:
        query["category"] = category
    if city:
        query["location.city"] = {"$regex": f"^{city.strip()}$", "$options": "i"}
    if featured is not None:
        query["is_featured"] = featured
    if upcoming:
        query["start_at"] = {"$gte": datetime.now(timezone.utc)}

    fetch_limit = min(max(limit, 1), 100)
    nearby = lat is not None and lng is not None and radius_km is not None
    events = await (
        db.events.find(query)
        .sort([("is_featured", -1), ("start_at", 1), ("created_at", -1)])
        .limit(fetch_limit if not nearby else min(fetch_limit * 8, 500))
        .to_list(fetch_limit if not nearby else min(fetch_limit * 8, 500))
    )

    if not nearby:
        return events

    radius = max(0.1, min(float(radius_km), 100.0))
    nearby_events = []
    for event in events:
        location = event.get("location") or {}
        event_lat = location.get("lat")
        event_lng = location.get("lng")
        if not isinstance(event_lat, (int, float)) or not isinstance(event_lng, (int, float)):
            continue
        distance = haversine_km(float(lat), float(lng), float(event_lat), float(event_lng))
        if distance <= radius:
            event["distance_km"] = distance
            nearby_events.append(event)

    nearby_events.sort(key=lambda item: (item.get("distance_km", 0), item["start_at"]))
    return nearby_events[:fetch_limit]


async def update_event(event: dict, payload: EventUpdate) -> dict:
    db = get_database()
    data = payload.model_dump(exclude_unset=True)
    if "cover_media" in data:
        data["cover_media"] = _dump(payload.cover_media)
    if "location" in data and data["location"] is not None:
        data["location"] = normalize_event_location(data["location"])
    data["updated_at"] = datetime.now(timezone.utc)

    await db.events.update_one({"_id": event["_id"]}, {"$set": data})
    updated = await db.events.find_one({"_id": event["_id"]})
    if updated is None:
        raise RuntimeError("Event was updated but could not be loaded.")
    if "start_at" in data:
        from app.services.event_reminders import reschedule_event_reminders

        await reschedule_event_reminders(updated)
    return updated


async def cancel_event(event: dict) -> None:
    db = get_database()
    await db.events.update_one(
        {"_id": event["_id"]},
        {"$set": {"is_cancelled": True, "updated_at": datetime.now(timezone.utc)}},
    )
    from app.services.event_reminders import cancel_event_reminders

    await cancel_event_reminders(str(event["_id"]))


async def attendance_status(event_id: str, user_id: str) -> str | None:
    db = get_database()
    attendee = await db.event_attendees.find_one({"event_id": event_id, "user_id": user_id})
    return attendee.get("status") if attendee else None


async def add_attendance(event: dict, user: dict, status: str) -> dict:
    db = get_database()
    event_id = str(event["_id"])
    user_id = str(user["_id"])
    previous = await db.event_attendees.find_one({"event_id": event_id, "user_id": user_id})
    now = datetime.now(timezone.utc)

    if previous:
        if previous["status"] != status:
            await db.event_attendees.update_one(
                {"_id": previous["_id"]},
                {"$set": {"status": status, "updated_at": now}},
            )
            await _adjust_counts(event["_id"], previous["status"], status)
        from app.services.event_reminders import ensure_event_reminders

        await ensure_event_reminders(event, user_id)
    else:
        try:
            await db.event_attendees.insert_one(
                build_event_attendee_document(event_id, user_id, status)
            )
            await _adjust_counts(event["_id"], None, status)
            await _notify_event_attendance(event, user, status)
            from app.services.event_reminders import ensure_event_reminders

            await ensure_event_reminders(event, user_id)
        except DuplicateKeyError:
            pass

    updated = await db.events.find_one({"_id": event["_id"]})
    return {
        "status": status,
        "attendees_count": max(0, int((updated or event).get("attendees_count", 0))),
        "interested_count": max(0, int((updated or event).get("interested_count", 0))),
    }


async def remove_attendance(event: dict, user: dict) -> dict:
    db = get_database()
    result = await db.event_attendees.find_one_and_delete(
        {"event_id": str(event["_id"]), "user_id": str(user["_id"])}
    )
    if result:
        await _adjust_counts(event["_id"], result["status"], None)
        from app.services.event_reminders import cancel_event_reminders

        await cancel_event_reminders(str(event["_id"]), str(user["_id"]))

    updated = await db.events.find_one({"_id": event["_id"]})
    return {
        "status": None,
        "attendees_count": max(0, int((updated or event).get("attendees_count", 0))),
        "interested_count": max(0, int((updated or event).get("interested_count", 0))),
    }


async def _adjust_counts(event_object_id: ObjectId, old_status: str | None, new_status: str | None) -> None:
    inc = {"attendees_count": 0, "interested_count": 0}
    if old_status == "going":
        inc["attendees_count"] -= 1
    if old_status == "interested":
        inc["interested_count"] -= 1
    if new_status == "going":
        inc["attendees_count"] += 1
    if new_status == "interested":
        inc["interested_count"] += 1

    db = get_database()
    await db.events.update_one(
        {"_id": event_object_id},
        {
            "$inc": {key: value for key, value in inc.items() if value},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    await db.events.update_many({"attendees_count": {"$lt": 0}}, {"$set": {"attendees_count": 0}})
    await db.events.update_many({"interested_count": {"$lt": 0}}, {"$set": {"interested_count": 0}})


async def list_attendees(event: dict, limit: int = 80) -> list[dict]:
    db = get_database()
    attendees = await (
        db.event_attendees.find({"event_id": str(event["_id"])})
        .sort([("status", 1), ("created_at", -1)])
        .limit(min(max(limit, 1), 100))
        .to_list(min(max(limit, 1), 100))
    )
    user_ids = [ObjectId(item["user_id"]) for item in attendees if ObjectId.is_valid(item["user_id"])]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(len(user_ids)) if user_ids else []
    by_id = {str(user["_id"]): user for user in users}
    return [
        {
            "user_id": item["user_id"],
            "username": by_id[item["user_id"]]["username"],
            "display_name": by_id[item["user_id"]]["display_name"],
            "avatar_url": by_id[item["user_id"]].get("avatar_url"),
            "city": by_id[item["user_id"]].get("city", ""),
            "status": item["status"],
            "created_at": item["created_at"],
        }
        for item in attendees
        if item["user_id"] in by_id
    ]


async def share_event(event: dict) -> dict:
    db = get_database()
    await db.events.update_one({"_id": event["_id"]}, {"$inc": {"shares_count": 1}})
    updated = await db.events.find_one({"_id": event["_id"]})
    return {
        "shared": True,
        "shares_count": max(0, int((updated or event).get("shares_count", 0))),
    }


async def _notify_event_attendance(event: dict, actor: dict, status: str) -> None:
    if event["creator_id"] == str(actor["_id"]):
        return

    from app.services.notifications import create_notification

    action = "se apuntó a" if status == "going" else "mostró interés en"
    await create_notification(
        user_id=event["creator_id"],
        actor=actor,
        type="event_attend",
        title="Movimiento en tu evento",
        body=f"{actor['display_name']} {action} {event['title']}",
        entity_type="event",
        entity_id=str(event["_id"]),
    )


async def to_event_out(event: dict, viewer: dict | None = None) -> EventOut:
    status = None
    if viewer is not None:
        status = await attendance_status(str(event["_id"]), str(viewer["_id"]))
    return EventOut(**serialize_event(event, status))
