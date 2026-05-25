import asyncio
from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.event import build_event_reminder_document


REMINDER_DELTAS = {
    "one_hour": timedelta(hours=1),
    "fifteen_minutes": timedelta(minutes=15),
}

REMINDER_LABELS = {
    "one_hour": "1 hora",
    "fifteen_minutes": "15 minutos",
}

_scheduler_task: asyncio.Task | None = None
_scheduler_stop_event: asyncio.Event | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def serialize_event_reminder(reminder: dict, event: dict | None = None, user: dict | None = None) -> dict:
    return {
        "id": str(reminder["_id"]),
        "event_id": reminder["event_id"],
        "user_id": reminder["user_id"],
        "reminder_type": reminder["reminder_type"],
        "scheduled_for": reminder["scheduled_for"],
        "sent_at": reminder.get("sent_at"),
        "status": reminder.get("status", "pending"),
        "event_title": event.get("title") if event else None,
        "username": user.get("username") if user else None,
        "created_at": reminder["created_at"],
    }


async def ensure_event_reminders(event: dict, user_id: str) -> None:
    if event.get("is_cancelled"):
        return

    start_at = _as_utc(event["start_at"])
    now = _now()
    if start_at <= now:
        return

    db = get_database()
    event_id = str(event["_id"])
    for reminder_type, delta in REMINDER_DELTAS.items():
        scheduled_for = start_at - delta
        if scheduled_for <= now:
            continue

        document = build_event_reminder_document(
            event_id=event_id,
            user_id=user_id,
            reminder_type=reminder_type,
            scheduled_for=scheduled_for,
        )
        insert_document = {
            key: value
            for key, value in document.items()
            if key not in {"scheduled_for", "status", "sent_at"}
        }
        try:
            await db.event_reminders.update_one(
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "reminder_type": reminder_type,
                },
                {
                    "$setOnInsert": insert_document,
                    "$set": {
                        "scheduled_for": scheduled_for,
                        "status": "pending",
                        "sent_at": None,
                    },
                },
                upsert=True,
            )
        except DuplicateKeyError:
            continue


async def cancel_event_reminders(event_id: str, user_id: str | None = None) -> int:
    db = get_database()
    query = {"event_id": event_id, "status": "pending"}
    if user_id is not None:
        query["user_id"] = user_id

    result = await db.event_reminders.update_many(
        query,
        {"$set": {"status": "cancelled"}},
    )
    return result.modified_count


async def reschedule_event_reminders(event: dict) -> None:
    event_id = str(event["_id"])
    await cancel_event_reminders(event_id)
    if event.get("is_cancelled") or _as_utc(event["start_at"]) <= _now():
        return

    db = get_database()
    attendees = await db.event_attendees.find({"event_id": event_id}).to_list(1000)
    for attendee in attendees:
        await ensure_event_reminders(event, attendee["user_id"])


async def process_due_event_reminders(limit: int = 50) -> int:
    db = get_database()
    processed = 0
    now = _now()
    stale_lock = now - timedelta(minutes=10)

    for _ in range(min(max(limit, 1), 100)):
        reminder = await db.event_reminders.find_one_and_update(
            {
                "status": "pending",
                "scheduled_for": {"$lte": now},
                "$or": [
                    {"processing_at": {"$exists": False}},
                    {"processing_at": {"$lte": stale_lock}},
                ],
            },
            {"$set": {"processing_at": now}},
            sort=[("scheduled_for", 1), ("_id", 1)],
            return_document=ReturnDocument.AFTER,
        )
        if reminder is None:
            break

        try:
            sent = await send_event_reminder(reminder)
            await db.event_reminders.update_one(
                {"_id": reminder["_id"]},
                {
                    "$set": {
                        "status": "sent" if sent else "cancelled",
                        "sent_at": _now() if sent else None,
                    },
                    "$unset": {"processing_at": ""},
                },
            )
            if sent:
                processed += 1
        except Exception:
            await db.event_reminders.update_one(
                {"_id": reminder["_id"]},
                {"$set": {"status": "failed"}, "$unset": {"processing_at": ""}},
            )

    return processed


async def send_event_reminder(reminder: dict) -> bool:
    db = get_database()
    event = await db.events.find_one({"_id": reminder["event_object_id"]}) if reminder.get("event_object_id") else None
    if event is None:
        from bson import ObjectId

        event_id = reminder["event_id"]
        if not ObjectId.is_valid(event_id):
            return False
        event = await db.events.find_one({"_id": ObjectId(event_id)})

    if event is None or event.get("is_cancelled"):
        return False

    attendee = await db.event_attendees.find_one(
        {"event_id": reminder["event_id"], "user_id": reminder["user_id"]}
    )
    if attendee is None:
        return False

    actor = {
        "_id": event["_id"],
        "username": "bucandey",
        "display_name": "BUCAN DEY",
        "avatar_url": None,
        "city": event.get("location", {}).get("city", ""),
    }
    label = REMINDER_LABELS.get(reminder["reminder_type"], "pronto")

    from app.services.notifications import create_notification

    await create_notification(
        user_id=reminder["user_id"],
        actor=actor,
        type="event_reminder",
        title="Tu evento empieza pronto",
        body=f"{event['title']} empieza en {label}",
        entity_type="event",
        entity_id=str(event["_id"]),
        dedupe=True,
        skip_self=False,
    )
    return True


async def list_event_reminders(
    *,
    status: str | None = None,
    event_id: str | None = None,
    limit: int = 80,
) -> list[dict]:
    db = get_database()
    query = {}
    if status:
        query["status"] = status
    if event_id:
        query["event_id"] = event_id

    fetch_limit = min(max(limit, 1), 100)
    reminders = await (
        db.event_reminders.find(query)
        .sort([("scheduled_for", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )
    event_ids = [reminder["event_id"] for reminder in reminders]
    user_ids = [reminder["user_id"] for reminder in reminders]

    from bson import ObjectId

    event_object_ids = [ObjectId(item) for item in event_ids if ObjectId.is_valid(item)]
    user_object_ids = [ObjectId(item) for item in user_ids if ObjectId.is_valid(item)]
    events = await db.events.find({"_id": {"$in": event_object_ids}}).to_list(len(event_object_ids)) if event_object_ids else []
    users = await db.users.find({"_id": {"$in": user_object_ids}}).to_list(len(user_object_ids)) if user_object_ids else []
    events_by_id = {str(event["_id"]): event for event in events}
    users_by_id = {str(user["_id"]): user for user in users}

    return [
        serialize_event_reminder(
            reminder,
            events_by_id.get(reminder["event_id"]),
            users_by_id.get(reminder["user_id"]),
        )
        for reminder in reminders
    ]


async def _scheduler_loop(interval_seconds: int) -> None:
    global _scheduler_stop_event
    _scheduler_stop_event = asyncio.Event()
    while not _scheduler_stop_event.is_set():
        try:
            await process_due_event_reminders()
        except Exception:
            pass

        try:
            await asyncio.wait_for(_scheduler_stop_event.wait(), timeout=interval_seconds)
        except TimeoutError:
            continue


def start_event_reminder_scheduler(interval_seconds: int = 60) -> None:
    global _scheduler_task
    if _scheduler_task is not None and not _scheduler_task.done():
        return
    _scheduler_task = asyncio.create_task(_scheduler_loop(interval_seconds))


async def stop_event_reminder_scheduler() -> None:
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
