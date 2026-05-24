from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.core.database import get_database
from app.services.posts import serialize_post
from app.services.reports import list_reports, to_report_out, update_report_status
from app.services.users import serialize_user


async def get_stats() -> dict:
    db = get_database()
    return {
        "total_users": await db.users.count_documents({}),
        "active_users": await db.users.count_documents({"is_active": True}),
        "total_posts": await db.posts.count_documents({"is_deleted": False}),
        "global_posts": await db.posts.count_documents({"visibility": "global", "is_deleted": False}),
        "hidden_posts": await db.posts.count_documents({"is_hidden": True, "is_deleted": False}),
        "total_comments": await db.comments.count_documents({"is_deleted": False}),
        "total_reports": await db.reports.count_documents({}),
        "pending_reports": await db.reports.count_documents({"status": "pending"}),
    }


async def list_users(search: str | None = None, limit: int = 50) -> list[dict]:
    db = get_database()
    query: dict[str, Any] = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"display_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    fetch_limit = min(max(limit, 1), 100)
    return await (
        db.users.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )


async def update_user_admin(user_id: str, payload: dict, current_admin: dict) -> dict | None:
    if not ObjectId.is_valid(user_id):
        return None

    db = get_database()
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if target is None:
        return None

    current_admin_id = str(current_admin["_id"])
    if user_id == current_admin_id and payload.get("is_active") is False:
        raise ValueError("You cannot deactivate yourself.")

    if target.get("role") == "admin" and payload.get("role") == "user":
        admin_count = await db.users.count_documents({"role": "admin", "is_active": True})
        if admin_count <= 1:
            raise ValueError("The last admin cannot lose admin role.")

    payload = {key: value for key, value in payload.items() if value is not None}
    if not payload:
        return target

    payload["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": target["_id"]}, {"$set": payload})
    return await db.users.find_one({"_id": target["_id"]})


async def list_posts(
    post_type: str | None = None,
    visibility: str | None = None,
    hidden: bool | None = None,
    limit: int = 50,
) -> list[dict]:
    db = get_database()
    query: dict[str, Any] = {"is_deleted": False}
    if post_type:
        query["type"] = post_type
    if visibility:
        query["visibility"] = visibility
    if hidden is not None:
        query["is_hidden"] = hidden

    fetch_limit = min(max(limit, 1), 100)
    return await (
        db.posts.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )


async def moderate_post(post_id: str, is_hidden: bool, reason: str = "") -> dict | None:
    if not ObjectId.is_valid(post_id):
        return None

    db = get_database()
    await db.posts.update_one(
        {"_id": ObjectId(post_id), "is_deleted": False},
        {
            "$set": {
                "is_hidden": is_hidden,
                "moderation_reason": reason,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return await db.posts.find_one({"_id": ObjectId(post_id), "is_deleted": False})


def serialize_admin_user(user: dict) -> dict:
    data = serialize_user(user)
    return {
        key: data[key]
        for key in [
            "id",
            "username",
            "display_name",
            "email",
            "city",
            "role",
            "is_active",
            "is_verified",
            "created_at",
        ]
    }


def serialize_admin_post(post: dict) -> dict:
    return serialize_post(post)


async def get_admin_reports(status: str | None, limit: int) -> list:
    return [to_report_out(report) for report in await list_reports(status=status, limit=limit)]


async def set_report_status(report_id: str, status: str):
    report = await update_report_status(report_id, status)
    return to_report_out(report) if report else None
