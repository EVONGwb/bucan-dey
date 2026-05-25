from datetime import datetime, timedelta, timezone
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException, status
from jose import jwt

from app.core.config import settings
from app.core.database import get_database
from app.core.realtime import realtime_manager
from app.models.live import build_live_document
from app.schemas.live import LiveOut, LiveStartRequest
from app.services.events import get_visible_creator_ids, haversine_km, visibility_query


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _require_livekit_config() -> None:
    if not settings.LIVEKIT_URL or not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
        )


def create_livekit_token(*, room_id: str, user: dict, can_publish: bool) -> str:
    _require_livekit_config()
    now = _now()
    payload = {
        "iss": settings.LIVEKIT_API_KEY,
        "sub": str(user["_id"]),
        "name": user.get("display_name") or user.get("username"),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(hours=6)).timestamp()),
        "video": {
            "room": room_id,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm="HS256")


def serialize_live(live: dict) -> dict:
    return {
        "id": str(live["_id"]),
        "creator_id": live["creator_id"],
        "creator_snapshot": live["creator_snapshot"],
        "title": live["title"],
        "description": live.get("description", ""),
        "category": live.get("category", "ambiente"),
        "thumbnail_url": live.get("thumbnail_url"),
        "provider": live.get("provider", "livekit"),
        "room_id": live["room_id"],
        "playback_url": live.get("playback_url"),
        "is_live": bool(live.get("is_live", False)),
        "started_at": live.get("started_at"),
        "ended_at": live.get("ended_at"),
        "location": live.get("location") or {},
        "viewers_count": max(0, int(live.get("viewers_count", 0))),
        "peak_viewers": max(0, int(live.get("peak_viewers", 0))),
        "visibility": live.get("visibility", "public"),
        "created_at": live["created_at"],
        "updated_at": live["updated_at"],
    }


def to_live_out(live: dict) -> LiveOut:
    return LiveOut(**serialize_live(live))


async def start_live(payload: LiveStartRequest, creator: dict) -> dict:
    _require_livekit_config()
    db = get_database()
    room_id = f"bucan-{creator['username']}-{uuid4().hex[:10]}"
    document = build_live_document(
        {
            **payload.model_dump(),
            "provider": "livekit",
            "playback_url": None,
        },
        creator,
        room_id,
    )
    result = await db.lives.insert_one(document)
    live = await db.lives.find_one({"_id": result.inserted_id})
    if live is None:
        raise RuntimeError("Live was created but could not be loaded.")

    await broadcast_live_started(live, creator)
    return {
        "live": to_live_out(live),
        "token": create_livekit_token(room_id=room_id, user=creator, can_publish=True),
        "room_id": room_id,
        "livekit_url": settings.LIVEKIT_URL,
        "playback_url": live.get("playback_url"),
    }


async def get_live_by_id(live_id: str) -> dict | None:
    if not ObjectId.is_valid(live_id):
        return None
    db = get_database()
    return await db.lives.find_one({"_id": ObjectId(live_id)})


async def can_view_live(live: dict, viewer: dict | None) -> bool:
    if not live.get("is_live"):
        return False
    if live.get("visibility") == "public":
        return True
    if viewer is None:
        return False
    if live.get("creator_id") == str(viewer["_id"]):
        return True

    from app.services.follows import is_following_user

    return await is_following_user(str(viewer["_id"]), live["creator_id"])


async def list_lives(
    *,
    viewer: dict | None = None,
    category: str | None = None,
    city: str | None = None,
    following_only: bool = False,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    limit: int = 40,
) -> list[dict]:
    db = get_database()
    following_ids = await get_visible_creator_ids(viewer)
    query = {"is_live": True, **visibility_query(viewer, following_ids)}
    if category:
        query["category"] = category
    if city:
        query["location.city"] = {"$regex": f"^{city.strip()}$", "$options": "i"}
    if following_only:
        if viewer is None:
            return []
        query["creator_id"] = {"$in": following_ids}

    fetch_limit = min(max(limit, 1), 100)
    has_nearby = lat is not None and lng is not None and radius_km is not None
    lives = await (
        db.lives.find(query)
        .sort([("viewers_count", -1), ("started_at", -1)])
        .limit(fetch_limit if not has_nearby else min(fetch_limit * 6, 300))
        .to_list(fetch_limit if not has_nearby else min(fetch_limit * 6, 300))
    )

    if not has_nearby:
        return lives

    radius = max(0.1, min(float(radius_km), 50.0))
    nearby = []
    for live in lives:
        location = live.get("location") or {}
        live_lat = location.get("lat")
        live_lng = location.get("lng")
        if not isinstance(live_lat, (int, float)) or not isinstance(live_lng, (int, float)):
            continue
        distance = haversine_km(float(lat), float(lng), float(live_lat), float(live_lng))
        if distance <= radius:
            live["distance_km"] = distance
            nearby.append(live)

    nearby.sort(key=lambda item: (item.get("distance_km", 0), -item.get("viewers_count", 0)))
    return nearby[:fetch_limit]


async def end_live(live: dict, user: dict) -> dict:
    if live["creator_id"] != str(user["_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator or admin can end this live.")

    db = get_database()
    await db.lives.update_one(
        {"_id": live["_id"]},
        {"$set": {"is_live": False, "ended_at": _now(), "updated_at": _now(), "viewers_count": 0}},
    )
    updated = await db.lives.find_one({"_id": live["_id"]})
    if updated:
        await realtime_manager.send_to_users(
            await get_live_audience_user_ids(updated),
            "live_ended",
            serialize_live(updated),
            exclude_user_id=str(user["_id"]),
        )
    return updated or live


async def register_viewer(live: dict, user: dict) -> dict:
    db = get_database()
    live_id = str(live["_id"])
    user_id = str(user["_id"])
    now = _now()
    await db.live_viewers.update_one(
        {"live_id": live_id, "user_id": user_id},
        {"$set": {"last_seen_at": now}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return await update_viewer_counts(live_id)


async def heartbeat_viewer(live: dict, user: dict) -> dict:
    return await register_viewer(live, user)


async def update_viewer_counts(live_id: str) -> dict:
    db = get_database()
    cutoff = _now() - timedelta(seconds=45)
    viewers_count = await db.live_viewers.count_documents(
        {"live_id": live_id, "last_seen_at": {"$gte": cutoff}}
    )
    if ObjectId.is_valid(live_id):
        await db.lives.update_one(
            {"_id": ObjectId(live_id)},
            {
                "$set": {"viewers_count": viewers_count, "updated_at": _now()},
                "$max": {"peak_viewers": viewers_count},
            },
        )
        live = await db.lives.find_one({"_id": ObjectId(live_id)})
        if live:
            await realtime_manager.send_to_users(
                await get_live_audience_user_ids(live),
                "live_viewers_update",
                {"live_id": live_id, "viewers_count": viewers_count, "peak_viewers": live.get("peak_viewers", viewers_count)},
            )
            return {
                "viewers_count": viewers_count,
                "peak_viewers": max(viewers_count, int(live.get("peak_viewers", 0))),
            }
    return {"viewers_count": viewers_count, "peak_viewers": viewers_count}


async def get_join_token(live: dict, user: dict) -> dict:
    return {
        "token": create_livekit_token(room_id=live["room_id"], user=user, can_publish=False),
        "room_id": live["room_id"],
        "livekit_url": settings.LIVEKIT_URL,
    }


async def send_live_comment(live: dict, user: dict, text: str) -> dict:
    payload = {
        "live_id": str(live["_id"]),
        "user_id": str(user["_id"]),
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "text": text,
        "created_at": _now().isoformat(),
    }
    await realtime_manager.send_to_users(
        await get_live_audience_user_ids(live),
        "live_comment",
        payload,
    )
    return payload


async def get_live_audience_user_ids(live: dict) -> list[str]:
    db = get_database()
    live_id = str(live["_id"])
    cutoff = _now() - timedelta(minutes=5)
    viewer_rows = await db.live_viewers.find(
        {"live_id": live_id, "last_seen_at": {"$gte": cutoff}},
        {"user_id": 1},
    ).to_list(500)
    user_ids = {item["user_id"] for item in viewer_rows}
    user_ids.add(live["creator_id"])
    return list(user_ids)


async def broadcast_live_started(live: dict, creator: dict) -> None:
    db = get_database()
    creator_id = str(creator["_id"])
    follows = await db.follows.find({"following_id": creator_id}, {"follower_id": 1}).to_list(1000)
    follower_ids = [item["follower_id"] for item in follows]

    await realtime_manager.send_to_users(
        follower_ids,
        "live_started",
        serialize_live(live),
        exclude_user_id=creator_id,
    )

    from app.services.notifications import create_notification

    for user_id in follower_ids:
        await create_notification(
            user_id=user_id,
            actor=creator,
            type="live_started",
            title="Directo en BUCAN DEY",
            body=f"{creator['display_name']} está en directo",
            entity_type="live",
            entity_id=str(live["_id"]),
            dedupe=True,
        )
