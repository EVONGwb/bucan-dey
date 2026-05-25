import base64
import json
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.follow import build_follow_document
from app.services.users import serialize_user


def encode_cursor(document: dict) -> str:
    raw = {
        "created_at": document["created_at"].isoformat(),
        "id": str(document["_id"]),
    }
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


async def is_following_user(follower_id: str, following_id: str) -> bool:
    db = get_database()
    follow = await db.follows.find_one(
        {"follower_id": follower_id, "following_id": following_id},
        {"_id": 1},
    )
    return follow is not None


async def serialize_follow_user(user: dict, viewer: dict | None = None) -> dict:
    is_following = False
    if viewer is not None and str(viewer["_id"]) != str(user["_id"]):
        is_following = await is_following_user(str(viewer["_id"]), str(user["_id"]))

    data = serialize_user(user, is_following=is_following)
    return {
        "id": data["id"],
        "username": data["username"],
        "display_name": data["display_name"],
        "avatar_url": data["avatar_url"],
        "city": data["city"],
        "country": data["country"],
        "followers_count": data["followers_count"],
        "following_count": data["following_count"],
        "is_following": data["is_following"],
    }


async def follow_user(current_user: dict, target_user: dict) -> dict:
    current_user_id = str(current_user["_id"])
    target_user_id = str(target_user["_id"])

    if current_user_id == target_user_id:
        raise ValueError("You cannot follow yourself.")

    db = get_database()
    inserted = False
    try:
        await db.follows.insert_one(
            build_follow_document(follower_id=current_user_id, following_id=target_user_id)
        )
        inserted = True
    except DuplicateKeyError:
        inserted = False

    if inserted:
        await db.users.update_one(
            {"_id": target_user["_id"]},
            {"$inc": {"followers_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"following_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        await create_follow_notification(target_user_id, current_user)

    updated_target = await db.users.find_one({"_id": target_user["_id"]})
    return {
        "following": True,
        "followers_count": max(0, int((updated_target or target_user).get("followers_count", 0))),
    }


async def unfollow_user(current_user: dict, target_user: dict) -> dict:
    current_user_id = str(current_user["_id"])
    target_user_id = str(target_user["_id"])

    if current_user_id == target_user_id:
        raise ValueError("You cannot unfollow yourself.")

    db = get_database()
    result = await db.follows.delete_one(
        {"follower_id": current_user_id, "following_id": target_user_id}
    )

    if result.deleted_count:
        now = datetime.now(timezone.utc)
        await db.users.update_one(
            {"_id": target_user["_id"], "followers_count": {"$gt": 0}},
            {"$inc": {"followers_count": -1}, "$set": {"updated_at": now}},
        )
        await db.users.update_one(
            {"_id": current_user["_id"], "following_count": {"$gt": 0}},
            {"$inc": {"following_count": -1}, "$set": {"updated_at": now}},
        )

    updated_target = await db.users.find_one({"_id": target_user["_id"]})
    return {
        "following": False,
        "followers_count": max(0, int((updated_target or target_user).get("followers_count", 0))),
    }


async def list_followers(
    user: dict,
    viewer: dict | None = None,
    limit: int = 30,
    cursor: str | None = None,
) -> tuple[list[dict], str | None]:
    return await _list_follow_users(
        user=user,
        viewer=viewer,
        limit=limit,
        cursor=cursor,
        edge_field="following_id",
        user_field="follower_id",
    )


async def list_following(
    user: dict,
    viewer: dict | None = None,
    limit: int = 30,
    cursor: str | None = None,
) -> tuple[list[dict], str | None]:
    return await _list_follow_users(
        user=user,
        viewer=viewer,
        limit=limit,
        cursor=cursor,
        edge_field="follower_id",
        user_field="following_id",
    )


async def _list_follow_users(
    *,
    user: dict,
    viewer: dict | None,
    limit: int,
    cursor: str | None,
    edge_field: str,
    user_field: str,
) -> tuple[list[dict], str | None]:
    db = get_database()
    query: dict = {edge_field: str(user["_id"])}
    cursor_data = decode_cursor(cursor)

    if cursor_data:
        cursor_created_at, cursor_id = cursor_data
        query["$or"] = [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "_id": {"$lt": cursor_id}},
        ]

    fetch_limit = min(max(limit, 1), 50)
    follows = await (
        db.follows.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit + 1)
        .to_list(fetch_limit + 1)
    )

    next_cursor = None
    if len(follows) > fetch_limit:
        next_cursor = encode_cursor(follows[fetch_limit - 1])
        follows = follows[:fetch_limit]

    user_ids = [ObjectId(follow[user_field]) for follow in follows if ObjectId.is_valid(follow[user_field])]
    if not user_ids:
        return [], next_cursor

    users = await db.users.find({"_id": {"$in": user_ids}, "is_active": True}).to_list(len(user_ids))
    by_id = {str(user["_id"]): user for user in users}
    items = [
        await serialize_follow_user(by_id[follow[user_field]], viewer)
        for follow in follows
        if follow[user_field] in by_id
    ]
    return items, next_cursor


async def suggested_users(viewer: dict | None = None, limit: int = 20) -> list[dict]:
    db = get_database()
    query: dict = {"is_active": True}
    if viewer is not None:
        query["_id"] = {"$ne": viewer["_id"]}

    fetch_limit = min(max(limit, 1), 50)
    users = await (
        db.users.find(query)
        .sort([("followers_count", -1), ("created_at", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )
    return [await serialize_follow_user(user, viewer) for user in users]


async def create_follow_notification(user_id: str, actor: dict) -> None:
    from app.services.notifications import create_notification

    display_name = actor.get("display_name") or actor.get("username", "Alguien")
    await create_notification(
        user_id=user_id,
        actor=actor,
        type="follow",
        title="Nuevo seguidor",
        body=f"{display_name} empezó a seguirte",
        entity_type="user",
        entity_id=str(actor["_id"]),
        dedupe=True,
    )
