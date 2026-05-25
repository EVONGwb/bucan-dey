import base64
import json
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.core.database import get_database
from app.models.post import build_post_document, normalize_location
from app.schemas.post import PostCreate, PostOut, PostUpdate


def _model_dump(model: Any) -> Any:
    if model is None:
        return None

    if hasattr(model, "model_dump"):
        return model.model_dump()

    return model


def serialize_post(post: dict, liked_by_me: bool = False) -> dict:
    return {
        "id": str(post["_id"]),
        "author_id": post["author_id"],
        "author_snapshot": post["author_snapshot"],
        "type": post.get("type", "normal"),
        "visibility": post.get("visibility", "global"),
        "text": post.get("text", ""),
        "media": post.get("media", []),
        "location": post.get("location", {}),
        "event_data": post.get("event_data"),
        "live_data": post.get("live_data"),
        "stats": post.get(
            "stats",
            {"likes_count": 0, "comments_count": 0, "views_count": 0},
        ),
        "is_deleted": post.get("is_deleted", False),
        "is_hidden": post.get("is_hidden", False),
        "liked_by_me": liked_by_me,
        "created_at": post["created_at"],
        "updated_at": post["updated_at"],
    }


def encode_cursor(post: dict) -> str:
    raw = {
        "created_at": post["created_at"].isoformat(),
        "id": str(post["_id"]),
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


async def create_post(payload: PostCreate, author: dict) -> dict:
    db = get_database()
    post_doc = build_post_document(
        {
            "type": payload.type,
            "visibility": payload.visibility,
            "text": payload.text,
            "media": [_model_dump(item) for item in payload.media],
            "location": _model_dump(payload.location) or {},
            "event_data": _model_dump(payload.event_data),
            "live_data": _model_dump(payload.live_data),
        },
        author,
    )
    result = await db.posts.insert_one(post_doc)
    created_post = await db.posts.find_one({"_id": result.inserted_id})
    if created_post is None:
        raise RuntimeError("Post was created but could not be loaded.")
    return created_post


async def get_post_by_id(post_id: str) -> dict | None:
    if not ObjectId.is_valid(post_id):
        return None

    db = get_database()
    return await db.posts.find_one({"_id": ObjectId(post_id)})


async def get_global_feed(limit: int, cursor: str | None = None) -> tuple[list[dict], str | None]:
    db = get_database()
    query: dict[str, Any] = {
        "visibility": "global",
        "is_deleted": False,
        "is_hidden": False,
    }
    cursor_data = decode_cursor(cursor)

    if cursor_data:
        cursor_created_at, cursor_id = cursor_data
        query["$or"] = [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "_id": {"$lt": cursor_id}},
        ]

    fetch_limit = min(max(limit, 1), 50)
    posts = await (
        db.posts.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit + 1)
        .to_list(fetch_limit + 1)
    )

    next_cursor = None
    if len(posts) > fetch_limit:
        next_cursor = encode_cursor(posts[fetch_limit - 1])
        posts = posts[:fetch_limit]

    return posts, next_cursor


async def get_profile_posts(username: str, viewer: dict | None = None) -> list[dict]:
    from app.services.users import get_user_by_username

    owner = await get_user_by_username(username)
    if owner is None:
        return []

    owner_id = str(owner["_id"])
    is_owner = viewer is not None and str(viewer["_id"]) == owner_id
    allowed_visibility = ["global", "profile_only", "private"] if is_owner else ["global", "profile_only"]

    db = get_database()
    return await (
        db.posts.find(
            {
                "author_id": owner_id,
                "visibility": {"$in": allowed_visibility},
                "is_deleted": False,
                "is_hidden": False,
            }
        )
        .sort([("created_at", -1), ("_id", -1)])
        .to_list(100)
    )


async def update_post(post: dict, payload: PostUpdate) -> dict:
    db = get_database()
    update_data = payload.model_dump(exclude_unset=True)

    if "location" in update_data and update_data["location"] is None:
        update_data["location"] = {}
    elif "location" in update_data:
        update_data["location"] = normalize_location(update_data["location"] or {})

    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.posts.update_one({"_id": post["_id"]}, {"$set": update_data})
    updated_post = await db.posts.find_one({"_id": post["_id"]})
    if updated_post is None:
        raise RuntimeError("Post was updated but could not be loaded.")
    return updated_post


async def soft_delete_post(post: dict) -> None:
    db = get_database()
    await db.posts.update_one(
        {"_id": post["_id"]},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc)}},
    )


async def add_like_flags(posts: list[dict], viewer: dict | None = None) -> list[tuple[dict, bool]]:
    if not viewer or not posts:
        return [(post, False) for post in posts]

    db = get_database()
    user_id = str(viewer["_id"])
    post_ids = [str(post["_id"]) for post in posts]
    likes = await db.likes.find(
        {"post_id": {"$in": post_ids}, "user_id": user_id},
        {"post_id": 1},
    ).to_list(len(post_ids))
    liked_post_ids = {like["post_id"] for like in likes}

    return [(post, str(post["_id"]) in liked_post_ids) for post in posts]


async def to_post_out(post: dict, viewer: dict | None = None) -> PostOut:
    liked_by_me = False
    if viewer is not None:
        from app.services.interactions import has_user_liked_post

        liked_by_me = await has_user_liked_post(str(post["_id"]), str(viewer["_id"]))

    return PostOut(**serialize_post(post, liked_by_me=liked_by_me))
