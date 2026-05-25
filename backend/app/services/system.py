import asyncio
import gzip
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import cloudinary.api
import cloudinary
from bson import ObjectId
from fastapi.encoders import jsonable_encoder

from app.core.config import settings
from app.core.database import get_database
from app.core.realtime import realtime_manager


APP_STARTED_AT = datetime.now(timezone.utc)
_latest_response_ms = 0
_scheduler_task: asyncio.Task | None = None
_scheduler_stop_event: asyncio.Event | None = None

BACKUP_COLLECTIONS = [
    "users",
    "posts",
    "comments",
    "events",
    "event_attendees",
    "stories",
    "lives",
    "live_viewers",
    "notifications",
    "chat_conversations",
    "chat_messages",
    "reports",
    "follows",
    "likes",
    "reposts",
]

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "api_key",
    "api_secret",
    "authorization",
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def set_latest_response_ms(value: int) -> None:
    global _latest_response_ms
    _latest_response_ms = max(0, value)


def _json_default(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def sanitize_details(value: Any) -> Any:
    if isinstance(value, dict):
        clean = {}
        for key, item in value.items():
            if any(secret_key in key.lower() for secret_key in SENSITIVE_KEYS):
                clean[key] = "[redacted]"
            else:
                clean[key] = sanitize_details(item)
        return clean
    if isinstance(value, list):
        return [sanitize_details(item) for item in value[:50]]
    if isinstance(value, str) and len(value) > 1200:
        return value[:1200] + "..."
    return value


def public_document(document: dict) -> dict:
    clean = dict(document)
    if "_id" in clean:
        clean["id"] = str(clean.pop("_id"))
    return jsonable_encoder(clean, custom_encoder={ObjectId: str})


async def log_system_event(
    *,
    level: str,
    source: str,
    message: str,
    details: dict | None = None,
) -> None:
    try:
        db = get_database()
        await db.system_logs.insert_one(
            {
                "level": level,
                "source": source,
                "message": message[:500],
                "details": sanitize_details(details or {}),
                "created_at": now_utc(),
            }
        )
    except Exception:
        pass


async def get_health_status() -> dict:
    db = get_database()
    timestamp = now_utc()
    checks = {
        "mongodb": "unknown",
        "websocket": "ok",
        "push": "ok" if settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY else "not_configured",
        "livekit": "ok" if settings.LIVEKIT_URL and settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET else "not_configured",
        "cloudinary": "ok"
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET
        else "not_configured",
    }

    try:
        await db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as exc:
        checks["mongodb"] = "error"
        await log_system_event(level="critical", source="backend", message="MongoDB health check failed", details={"error": str(exc)})

    active_lives = 0
    active_users_estimate = realtime_manager.online_users_count
    try:
        active_lives = await db.lives.count_documents({"is_live": True, "moderation_status": {"$ne": "blocked"}})
    except Exception:
        checks["mongodb"] = "error"

    status = "ok" if all(value in {"ok", "not_configured"} for value in checks.values()) and checks["mongodb"] == "ok" else "degraded"
    return {
        "status": status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        **checks,
        "uptime_seconds": int((timestamp - APP_STARTED_AT).total_seconds()),
        "active_lives": active_lives,
        "active_users_estimate": active_users_estimate,
        "timestamp": timestamp,
    }


async def collect_metrics_snapshot() -> dict:
    db = get_database()
    since = now_utc() - timedelta(hours=24)
    metrics = {
        "total_users": await db.users.count_documents({}),
        "active_users_24h": await db.users.count_documents({"updated_at": {"$gte": since}}),
        "total_posts": await db.posts.count_documents({"is_deleted": {"$ne": True}}),
        "total_stories": await db.stories.count_documents({}),
        "total_events": await db.events.count_documents({"is_cancelled": {"$ne": True}}),
        "total_lives": await db.lives.count_documents({}),
        "active_lives": await db.lives.count_documents({"is_live": True, "moderation_status": {"$ne": "blocked"}}),
        "websocket_connections": realtime_manager.connections_count,
        "push_subscriptions": await db.push_subscriptions.count_documents({"is_active": True}),
        "backend_response_ms": _latest_response_ms,
        "created_at": now_utc(),
    }
    await db.system_metrics.insert_one(metrics)
    return public_document(metrics)


async def _write_collection_backup(db, output: gzip.GzipFile, collection_name: str) -> int:
    count = 0
    async for document in db[collection_name].find({}):
        row = {
            "collection": collection_name,
            "document": jsonable_encoder(document, custom_encoder={ObjectId: str}),
        }
        output.write((json.dumps(row, default=_json_default, ensure_ascii=False) + "\n").encode())
        count += 1
    return count


async def run_mongodb_backup() -> dict:
    db = get_database()
    started_at = now_utc()
    backup_dir = Path(settings.SYSTEM_BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)
    filename = f"mongodb-{settings.DB_NAME}-{started_at.strftime('%Y%m%d-%H%M%S')}.jsonl.gz"
    path = backup_dir / filename
    metadata = {
        "type": "mongodb",
        "started_at": started_at,
        "finished_at": None,
        "status": "running",
        "size_bytes": 0,
        "notes": f"collections={','.join(BACKUP_COLLECTIONS)}",
        "path": str(path),
    }
    result = await db.system_backups.insert_one(metadata)
    try:
        total_documents = 0
        with gzip.open(path, "wb") as output:
            for collection_name in BACKUP_COLLECTIONS:
                total_documents += await _write_collection_backup(db, output, collection_name)
        size_bytes = path.stat().st_size
        update = {
            "finished_at": now_utc(),
            "status": "success",
            "size_bytes": size_bytes,
            "notes": f"documents={total_documents}; path={path}",
        }
        await db.system_backups.update_one({"_id": result.inserted_id}, {"$set": update})
        return public_document({**metadata, **update, "id": str(result.inserted_id)})
    except Exception as exc:
        await db.system_backups.update_one(
            {"_id": result.inserted_id},
            {"$set": {"finished_at": now_utc(), "status": "failed", "notes": str(exc)[:500]}},
        )
        await log_system_event(level="critical", source="backend", message="MongoDB backup failed", details={"error": str(exc)})
        return public_document({**metadata, "status": "failed", "notes": str(exc)[:500], "id": str(result.inserted_id)})


async def run_cloudinary_manifest_backup() -> dict:
    db = get_database()
    started_at = now_utc()
    backup_dir = Path(settings.SYSTEM_BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)
    filename = f"cloudinary-manifest-{started_at.strftime('%Y%m%d-%H%M%S')}.json.gz"
    path = backup_dir / filename
    metadata = {
        "type": "cloudinary_manifest",
        "started_at": started_at,
        "finished_at": None,
        "status": "running",
        "size_bytes": 0,
        "notes": "Cloudinary resource manifest",
        "path": str(path),
    }
    result = await db.system_backups.insert_one(metadata)
    try:
        resources = []
        api_error = ""
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
            try:
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True,
                )
                next_cursor = None
                for _ in range(10):
                    response = cloudinary.api.resources(
                        type="upload",
                        prefix=settings.CLOUDINARY_UPLOAD_FOLDER,
                        max_results=500,
                        next_cursor=next_cursor,
                    )
                    resources.extend(response.get("resources", []))
                    next_cursor = response.get("next_cursor")
                    if not next_cursor:
                        break
            except Exception as exc:
                api_error = str(exc)[:300]
                await log_system_event(
                    level="warning",
                    source="backend",
                    message="Cloudinary API manifest fallback used",
                    details={"error": api_error},
                )
                resources = await collect_cloudinary_references_from_mongo()
        with gzip.open(path, "wt", encoding="utf-8") as output:
            json.dump(
                {
                    "generated_at": started_at.isoformat(),
                    "source": "cloudinary_api" if not api_error else "mongodb_media_references",
                    "api_error": api_error,
                    "resources": resources,
                },
                output,
                default=_json_default,
            )
        size_bytes = path.stat().st_size
        update = {
            "finished_at": now_utc(),
            "status": "success",
            "size_bytes": size_bytes,
            "notes": f"assets={len(resources)}; source={'cloudinary_api' if not api_error else 'mongodb_media_references'}; path={path}",
        }
        await db.system_backups.update_one({"_id": result.inserted_id}, {"$set": update})
        return public_document({**metadata, **update, "id": str(result.inserted_id)})
    except Exception as exc:
        await db.system_backups.update_one(
            {"_id": result.inserted_id},
            {"$set": {"finished_at": now_utc(), "status": "failed", "notes": str(exc)[:500]}},
        )
        await log_system_event(level="critical", source="backend", message="Cloudinary manifest backup failed", details={"error": str(exc)})
        return public_document({**metadata, "status": "failed", "notes": str(exc)[:500], "id": str(result.inserted_id)})


async def collect_cloudinary_references_from_mongo() -> list[dict]:
    db = get_database()
    references: list[dict] = []

    async def add_ref(source: str, owner_id: str, media: dict | None) -> None:
        if not media:
            return
        url = media.get("url") or media.get("thumbnail_url")
        public_id = media.get("public_id")
        if not url and not public_id:
            return
        references.append(
            {
                "source": source,
                "owner_id": owner_id,
                "url": url,
                "thumbnail_url": media.get("thumbnail_url"),
                "public_id": public_id,
                "type": media.get("type"),
            }
        )

    async for post in db.posts.find({"media.url": {"$exists": True}}, {"media": 1}):
        media_items = post.get("media") or []
        if isinstance(media_items, dict):
            media_items = [media_items]
        for media in media_items:
            await add_ref("post", str(post["_id"]), media)

    async for story in db.stories.find({"media.url": {"$exists": True}}, {"media": 1}):
        await add_ref("story", str(story["_id"]), story.get("media"))

    async for event in db.events.find({"cover_media.url": {"$exists": True}}, {"cover_media": 1}):
        await add_ref("event", str(event["_id"]), event.get("cover_media"))

    async for live in db.lives.find({"thumbnail_url": {"$nin": [None, ""]}}, {"thumbnail_url": 1}):
        references.append(
            {
                "source": "live",
                "owner_id": str(live["_id"]),
                "url": live.get("thumbnail_url"),
                "thumbnail_url": live.get("thumbnail_url"),
                "public_id": None,
                "type": "image",
            }
        )
    return references


async def run_github_metadata_backup() -> dict:
    db = get_database()
    started_at = now_utc()
    metadata = {
        "type": "github_metadata",
        "started_at": started_at,
        "finished_at": now_utc(),
        "status": "success",
        "size_bytes": 0,
        "notes": json.dumps(
            {
                "commit": os.getenv("RENDER_GIT_COMMIT", ""),
                "branch": os.getenv("RENDER_GIT_BRANCH", "main"),
                "service": os.getenv("RENDER_SERVICE_NAME", "bucan-dey-api"),
                "captured_at": started_at.isoformat(),
            },
            ensure_ascii=False,
        ),
    }
    result = await db.system_backups.insert_one(metadata)
    return public_document({**metadata, "id": str(result.inserted_id)})


async def run_all_backups() -> list[dict]:
    results = [
        await run_mongodb_backup(),
        await run_cloudinary_manifest_backup(),
        await run_github_metadata_backup(),
    ]
    for item in results:
        if item.get("status") == "failed":
            await create_admin_alert("Backup fallido", f"{item.get('type')} terminó con error", "backup_failed")
    return results


async def create_admin_alert(title: str, body: str, alert_type: str) -> None:
    try:
        db = get_database()
        admins = await db.users.find({"role": "admin", "is_active": True}).to_list(100)
        if not admins:
            return
        from app.services.notifications import create_notification

        actor = {
            "_id": "system",
            "username": "bucan",
            "display_name": "BUCAN DEY",
            "avatar_url": None,
            "city": "",
        }
        for admin in admins:
            await create_notification(
                user_id=str(admin["_id"]),
                actor=actor,
                type="system_alert",
                title=title,
                body=body,
                entity_type="system",
                entity_id=alert_type,
                skip_self=False,
            )
    except Exception:
        pass


def serialize_system_doc(document: dict) -> dict:
    return public_document(document)


async def list_backups(limit: int = 20) -> list[dict]:
    db = get_database()
    rows = await db.system_backups.find({}).sort("started_at", -1).limit(min(max(limit, 1), 100)).to_list(limit)
    return [serialize_system_doc(row) for row in rows]


async def list_logs(level: str | None = None, source: str | None = None, limit: int = 50) -> list[dict]:
    db = get_database()
    query = {}
    if level:
        query["level"] = level
    if source:
        query["source"] = source
    rows = await db.system_logs.find(query).sort("created_at", -1).limit(min(max(limit, 1), 100)).to_list(limit)
    return [serialize_system_doc(row) for row in rows]


async def list_metrics(limit: int = 60) -> list[dict]:
    db = get_database()
    rows = await db.system_metrics.find({}).sort("created_at", -1).limit(min(max(limit, 1), 200)).to_list(limit)
    return [serialize_system_doc(row) for row in reversed(rows)]


async def get_system_overview() -> dict:
    return {
        "health": await get_health_status(),
        "backups": await list_backups(limit=5),
        "logs": await list_logs(limit=10),
        "metrics": await list_metrics(limit=24),
    }


async def _scheduler_loop() -> None:
    global _scheduler_stop_event
    _scheduler_stop_event = asyncio.Event()
    last_backup_at: datetime | None = None
    try:
        db = get_database()
        latest = await db.system_backups.find_one(
            {"status": "success", "type": {"$in": ["mongodb", "cloudinary_manifest"]}},
            sort=[("started_at", -1)],
        )
        if latest:
            last_backup_at = latest.get("started_at")
            if last_backup_at and last_backup_at.tzinfo is None:
                last_backup_at = last_backup_at.replace(tzinfo=timezone.utc)
    except Exception:
        last_backup_at = now_utc()
    while not _scheduler_stop_event.is_set():
        try:
            await collect_metrics_snapshot()
            if settings.SYSTEM_BACKUP_ENABLED:
                if last_backup_at is None or now_utc() - last_backup_at >= timedelta(hours=settings.SYSTEM_BACKUP_INTERVAL_HOURS):
                    last_backup_at = now_utc()
                    await run_all_backups()
        except Exception as exc:
            await log_system_event(level="error", source="backend", message="System scheduler failed", details={"error": str(exc)})

        try:
            await asyncio.wait_for(_scheduler_stop_event.wait(), timeout=settings.SYSTEM_METRICS_INTERVAL_SECONDS)
        except TimeoutError:
            continue


def start_system_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task is not None and not _scheduler_task.done():
        return
    _scheduler_task = asyncio.create_task(_scheduler_loop())


async def stop_system_scheduler() -> None:
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
