import base64
import json
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.report import build_report_document
from app.schemas.report import ReportCreate, ReportOut


async def target_exists(target_type: str, target_id: str) -> bool:
    if not ObjectId.is_valid(target_id):
        return False

    db = get_database()
    object_id = ObjectId(target_id)

    if target_type == "post":
        return await db.posts.find_one({"_id": object_id, "is_deleted": False}) is not None
    if target_type == "comment":
        return await db.comments.find_one({"_id": object_id, "is_deleted": False}) is not None
    if target_type == "user":
        return await db.users.find_one({"_id": object_id}) is not None

    return False


def serialize_report(report: dict) -> dict:
    return {
        "id": str(report["_id"]),
        "reporter_id": report["reporter_id"],
        "reporter_snapshot": report["reporter_snapshot"],
        "target_type": report["target_type"],
        "target_id": report["target_id"],
        "reason": report["reason"],
        "details": report.get("details", ""),
        "status": report.get("status", "pending"),
        "created_at": report["created_at"],
        "updated_at": report["updated_at"],
    }


def to_report_out(report: dict) -> ReportOut:
    return ReportOut(**serialize_report(report))


def encode_cursor(document: dict) -> str:
    raw = {"created_at": document["created_at"].isoformat(), "id": str(document["_id"])}
    return base64.urlsafe_b64encode(json.dumps(raw).encode()).decode()


def decode_cursor(cursor: str | None) -> tuple[datetime, ObjectId] | None:
    if not cursor:
        return None

    try:
        raw = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        created_at = datetime.fromisoformat(raw["created_at"])
        if created_at.tzinfo is not None:
            created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
        return created_at, ObjectId(raw["id"])
    except (ValueError, KeyError, TypeError):
        return None


async def create_report(payload: ReportCreate, reporter: dict) -> dict:
    db = get_database()
    if not await target_exists(payload.target_type, payload.target_id):
        raise ValueError("Reported target was not found.")

    report = build_report_document(
        reporter=reporter,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        details=payload.details,
    )

    try:
        result = await db.reports.insert_one(report)
    except DuplicateKeyError:
        raise ValueError("You already reported this target.") from None

    created = await db.reports.find_one({"_id": result.inserted_id})
    if created is None:
        raise RuntimeError("Report was created but could not be loaded.")
    return created


async def list_reports(status: str | None = None, limit: int = 50) -> list[dict]:
    db = get_database()
    query: dict[str, Any] = {}
    if status:
        query["status"] = status

    fetch_limit = min(max(limit, 1), 100)
    return await (
        db.reports.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )


async def update_report_status(report_id: str, status: str) -> dict | None:
    if not ObjectId.is_valid(report_id):
        return None

    db = get_database()
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.reports.find_one({"_id": ObjectId(report_id)})
