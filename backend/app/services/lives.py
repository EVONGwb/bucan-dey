import asyncio
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

_scheduler_task: asyncio.Task | None = None
_scheduler_stop_event: asyncio.Event | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _system_actor() -> dict:
    return {
        "_id": "system",
        "username": "bucan",
        "display_name": "BUCAN DEY",
        "avatar_url": None,
        "city": "",
    }


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
        "ended_reason": live.get("ended_reason"),
        "location": live.get("location") or {},
        "viewers_count": max(0, int(live.get("viewers_count", 0))),
        "peak_viewers": max(0, int(live.get("peak_viewers", 0))),
        "max_duration_minutes": int(live.get("max_duration_minutes") or settings.LIVE_MAX_DURATION_MINUTES),
        "total_watch_time_seconds": max(0, int(live.get("total_watch_time_seconds", 0))),
        "total_unique_viewers": max(0, int(live.get("total_unique_viewers", 0))),
        "bitrate_mode": live.get("bitrate_mode", "auto"),
        "moderation_status": live.get("moderation_status", "active"),
        "reports_count": max(0, int(live.get("reports_count", 0))),
        "last_heartbeat_at": live.get("last_heartbeat_at"),
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
            "max_duration_minutes": payload.max_duration_minutes or settings.LIVE_MAX_DURATION_MINUTES,
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
    if live.get("moderation_status") == "blocked":
        return bool(viewer and viewer.get("role") == "admin")
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
    query = {
        "is_live": True,
        "moderation_status": {"$ne": "blocked"},
        **visibility_query(viewer, following_ids),
    }
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


async def end_live(live: dict, user: dict, ended_reason: str | None = None, notify_creator: bool = False) -> dict:
    is_system = str(user.get("_id")) == "system"
    if live["creator_id"] != str(user["_id"]) and user.get("role") != "admin" and not is_system:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator or admin can end this live.")

    db = get_database()
    reason = ended_reason or ("admin" if user.get("role") == "admin" and live["creator_id"] != str(user["_id"]) else "manual")
    await db.lives.update_one(
        {"_id": live["_id"]},
        {
            "$set": {
                "is_live": False,
                "ended_at": _now(),
                "ended_reason": reason,
                "updated_at": _now(),
                "viewers_count": 0,
            }
        },
    )
    await db.live_viewers.update_many({"live_id": str(live["_id"])}, {"$set": {"active": False}})
    updated = await db.lives.find_one({"_id": live["_id"]})
    if updated:
        await realtime_manager.send_to_users(
            await get_live_audience_user_ids(updated),
            "live_ended",
            serialize_live(updated),
            exclude_user_id=None if is_system else str(user["_id"]),
        )
        if notify_creator and reason in {"inactive", "timeout", "network"}:
            from app.services.notifications import create_notification

            body = "Tu directo terminó automáticamente."
            if reason == "inactive":
                body = "Tu directo terminó automáticamente por inactividad."
            elif reason == "timeout":
                body = "Tu directo terminó porque alcanzó la duración máxima."
            await create_notification(
                user_id=updated["creator_id"],
                actor=_system_actor(),
                type="live_ended_auto",
                title="Directo finalizado",
                body=body,
                entity_type="live",
                entity_id=str(updated["_id"]),
                skip_self=False,
            )
    return updated or live


async def register_viewer(live: dict, user: dict, role: str = "viewer") -> dict:
    db = get_database()
    live_id = str(live["_id"])
    user_id = str(user["_id"])
    now = _now()
    is_streamer = role == "streamer" and live["creator_id"] == user_id
    if is_streamer:
        await db.lives.update_one(
            {"_id": live["_id"]},
            {"$set": {"last_heartbeat_at": now, "updated_at": now}},
        )
        return await update_viewer_counts(live_id)

    existing = await db.live_viewers.find_one({"live_id": live_id, "user_id": user_id})
    increment_watch = 0
    if existing:
        last_credit = _as_aware(existing.get("last_watch_credit_at") or existing.get("last_seen_at"))
        if last_credit:
            increment_watch = max(0, min(int((now - last_credit).total_seconds()), 30))
    await db.live_viewers.update_one(
        {"live_id": live_id, "user_id": user_id},
        {
            "$set": {"last_seen_at": now, "last_watch_credit_at": now, "active": True},
            "$inc": {"watch_time_seconds": increment_watch},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    unique_count = await db.live_viewers.count_documents({"live_id": live_id})
    await db.lives.update_one(
        {"_id": live["_id"]},
        {
            "$inc": {"total_watch_time_seconds": increment_watch},
            "$set": {"total_unique_viewers": unique_count, "updated_at": now},
        },
    )
    return await update_viewer_counts(live_id)


async def heartbeat_viewer(live: dict, user: dict, role: str = "viewer") -> dict:
    return await register_viewer(live, user, role)


async def update_viewer_counts(live_id: str) -> dict:
    db = get_database()
    cutoff = _now() - timedelta(seconds=settings.LIVE_VIEWER_INACTIVE_SECONDS)
    await db.live_viewers.update_many(
        {"live_id": live_id, "last_seen_at": {"$lt": cutoff}, "active": True},
        {"$set": {"active": False}},
    )
    viewers_count = await db.live_viewers.count_documents(
        {"live_id": live_id, "last_seen_at": {"$gte": cutoff}, "active": True}
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


async def get_live_stats(live: dict) -> dict:
    counts = await update_viewer_counts(str(live["_id"]))
    updated = await get_live_by_id(str(live["_id"])) or live
    started_at = _as_aware(updated.get("started_at"))
    ended_at = _as_aware(updated.get("ended_at")) or _now()
    duration_seconds = int((ended_at - started_at).total_seconds()) if started_at else 0
    return {
        "current_viewers": counts["viewers_count"],
        "peak_viewers": max(counts["peak_viewers"], int(updated.get("peak_viewers", 0))),
        "total_unique_viewers": max(0, int(updated.get("total_unique_viewers", 0))),
        "total_watch_time_seconds": max(0, int(updated.get("total_watch_time_seconds", 0))),
        "duration_seconds": max(0, duration_seconds),
    }


async def report_live(live: dict, user: dict, reason: str, details: str = "") -> dict:
    db = get_database()
    now = _now()
    document = {
        "live_id": str(live["_id"]),
        "reporter_id": str(user["_id"]),
        "reporter_snapshot": {
            "username": user.get("username", ""),
            "display_name": user.get("display_name", ""),
            "avatar_url": user.get("avatar_url"),
            "city": user.get("city", ""),
        },
        "reason": reason,
        "details": details,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.live_reports.update_one(
        {"live_id": document["live_id"], "reporter_id": document["reporter_id"]},
        {"$setOnInsert": document},
        upsert=True,
    )
    if result.upserted_id:
        await db.lives.update_one(
            {"_id": live["_id"]},
            {"$inc": {"reports_count": 1}, "$set": {"updated_at": now}},
        )
    updated = await db.lives.find_one({"_id": live["_id"]})
    if updated and int(updated.get("reports_count", 0)) >= 3 and updated.get("moderation_status") == "active":
        await db.lives.update_one(
            {"_id": live["_id"]},
            {"$set": {"moderation_status": "flagged", "updated_at": now}},
        )
    return {"message": "Live reported"}


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


async def list_admin_lives(
    *,
    status_filter: str | None = None,
    active: bool | None = None,
    limit: int = 80,
) -> list[LiveOut]:
    db = get_database()
    query: dict = {}
    if status_filter:
        query["moderation_status"] = status_filter
    if active is not None:
        query["is_live"] = active
    rows = await (
        db.lives.find(query)
        .sort([("is_live", -1), ("reports_count", -1), ("started_at", -1)])
        .limit(min(max(limit, 1), 100))
        .to_list(min(max(limit, 1), 100))
    )
    return [to_live_out(row) for row in rows]


async def update_live_admin(live: dict, payload: dict, admin: dict) -> dict:
    db = get_database()
    updates: dict = {"updated_at": _now()}
    moderation_status = payload.get("moderation_status")
    if moderation_status:
        updates["moderation_status"] = moderation_status

    if moderation_status == "blocked":
        updates["is_live"] = False
        updates["ended_at"] = _now()
        updates["ended_reason"] = "admin"
        updates["viewers_count"] = 0

    await db.lives.update_one({"_id": live["_id"]}, {"$set": updates})
    updated = await db.lives.find_one({"_id": live["_id"]}) or live
    if payload.get("end_live") and updated.get("is_live"):
        updated = await end_live(updated, admin, ended_reason=payload.get("ended_reason") or "admin")
    elif moderation_status == "blocked":
        await db.live_viewers.update_many({"live_id": str(live["_id"])}, {"$set": {"active": False}})
        await realtime_manager.send_to_users(
            await get_live_audience_user_ids(updated),
            "live_ended",
            serialize_live(updated),
            exclude_user_id=str(admin["_id"]),
        )
    return updated


async def process_live_controls() -> int:
    db = get_database()
    now = _now()
    active_lives = await db.lives.find({"is_live": True}).to_list(200)
    processed = 0
    for live in active_lives:
        await update_viewer_counts(str(live["_id"]))
        if live.get("moderation_status") == "blocked":
            await end_live(live, _system_actor(), ended_reason="admin")
            processed += 1
            continue

        started_at = _as_aware(live.get("started_at"))
        max_minutes = int(live.get("max_duration_minutes") or settings.LIVE_MAX_DURATION_MINUTES)
        if started_at and now - started_at >= timedelta(minutes=max_minutes):
            await end_live(live, _system_actor(), ended_reason="timeout", notify_creator=True)
            processed += 1
            continue

        last_heartbeat = _as_aware(live.get("last_heartbeat_at") or live.get("started_at"))
        if last_heartbeat and now - last_heartbeat >= timedelta(minutes=settings.LIVE_STREAMER_INACTIVE_MINUTES):
            await end_live(live, _system_actor(), ended_reason="inactive", notify_creator=True)
            processed += 1
            continue
    return processed


async def _scheduler_loop(interval_seconds: int) -> None:
    global _scheduler_stop_event
    _scheduler_stop_event = asyncio.Event()
    while not _scheduler_stop_event.is_set():
        try:
            await process_live_controls()
        except Exception:
            pass

        try:
            await asyncio.wait_for(_scheduler_stop_event.wait(), timeout=interval_seconds)
        except TimeoutError:
            continue


def start_live_control_scheduler(interval_seconds: int | None = None) -> None:
    global _scheduler_task
    if _scheduler_task is not None and not _scheduler_task.done():
        return
    _scheduler_task = asyncio.create_task(
        _scheduler_loop(interval_seconds or settings.LIVE_CONTROL_INTERVAL_SECONDS)
    )


async def stop_live_control_scheduler() -> None:
    global _scheduler_task, _scheduler_stop_event
    if _scheduler_stop_event is not None:
        _scheduler_stop_event.set()
    if _scheduler_task is not None:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
    _scheduler_task = None
    _scheduler_stop_event = None
