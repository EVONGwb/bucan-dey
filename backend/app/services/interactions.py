import base64
import json
from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.comment import build_comment_document
from app.models.repost import build_repost_document
from app.schemas.comment import CommentOut


def _post_query(post: dict) -> dict:
    return {"_id": post["_id"]}


def serialize_comment(comment: dict) -> dict:
    return {
        "id": str(comment["_id"]),
        "post_id": comment["post_id"],
        "author_id": comment["author_id"],
        "author_snapshot": comment["author_snapshot"],
        "text": comment["text"],
        "is_deleted": comment.get("is_deleted", False),
        "created_at": comment["created_at"],
        "updated_at": comment["updated_at"],
    }


def to_comment_out(comment: dict) -> CommentOut:
    return CommentOut(**serialize_comment(comment))


def encode_comment_cursor(comment: dict) -> str:
    raw = {"created_at": comment["created_at"].isoformat(), "id": str(comment["_id"])}
    return base64.urlsafe_b64encode(json.dumps(raw).encode()).decode()


def decode_comment_cursor(cursor: str | None) -> tuple[datetime, ObjectId] | None:
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


async def has_user_liked_post(post_id: str, user_id: str | None) -> bool:
    if not user_id:
        return False

    db = get_database()
    like = await db.likes.find_one({"post_id": post_id, "user_id": user_id})
    return like is not None


async def has_user_reposted_post(post_id: str, user_id: str | None) -> bool:
    if not user_id:
        return False

    db = get_database()
    repost = await db.reposts.find_one({"post_id": post_id, "user_id": user_id})
    return repost is not None


async def add_like(post: dict, user: dict) -> dict:
    db = get_database()
    post_id = str(post["_id"])
    user_id = str(user["_id"])

    try:
        await db.likes.insert_one(
            {
                "post_id": post_id,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc),
            }
        )
        updated_post = await db.posts.find_one_and_update(
            _post_query(post),
            {"$inc": {"stats.likes_count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        await _notify_post_like(post, user)
    except DuplicateKeyError:
        updated_post = await db.posts.find_one(_post_query(post))

    return {
        "liked": True,
        "likes_count": max(0, (updated_post or post).get("stats", {}).get("likes_count", 0)),
    }


async def remove_like(post: dict, user: dict) -> dict:
    db = get_database()
    post_id = str(post["_id"])
    user_id = str(user["_id"])
    result = await db.likes.delete_one({"post_id": post_id, "user_id": user_id})

    if result.deleted_count:
        updated_post = await db.posts.find_one_and_update(
            {
                "_id": post["_id"],
                "stats.likes_count": {"$gt": 0},
            },
            {"$inc": {"stats.likes_count": -1}},
            return_document=ReturnDocument.AFTER,
        )
    else:
        updated_post = await db.posts.find_one(_post_query(post))

    return {
        "liked": False,
        "likes_count": max(0, (updated_post or post).get("stats", {}).get("likes_count", 0)),
    }


async def add_repost(post: dict, user: dict) -> dict:
    db = get_database()
    post_id = str(post["_id"])
    user_id = str(user["_id"])

    try:
        await db.reposts.insert_one(build_repost_document(user_id=user_id, post_id=post_id))
        updated_post = await db.posts.find_one_and_update(
            _post_query(post),
            {"$inc": {"stats.reposts_count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        await _notify_post_repost(post, user)
    except DuplicateKeyError:
        updated_post = await db.posts.find_one(_post_query(post))

    return {
        "reposted": True,
        "reposts_count": max(0, (updated_post or post).get("stats", {}).get("reposts_count", 0)),
    }


async def remove_repost(post: dict, user: dict) -> dict:
    db = get_database()
    post_id = str(post["_id"])
    user_id = str(user["_id"])
    result = await db.reposts.delete_one({"post_id": post_id, "user_id": user_id})

    if result.deleted_count:
        updated_post = await db.posts.find_one_and_update(
            {"_id": post["_id"], "stats.reposts_count": {"$gt": 0}},
            {"$inc": {"stats.reposts_count": -1}},
            return_document=ReturnDocument.AFTER,
        )
    else:
        updated_post = await db.posts.find_one(_post_query(post))

    return {
        "reposted": False,
        "reposts_count": max(0, (updated_post or post).get("stats", {}).get("reposts_count", 0)),
    }


async def share_post(post: dict, user: dict, target: str, conversation_id: str | None = None) -> dict:
    db = get_database()
    message_id = None

    if target == "chat":
        if not conversation_id:
            raise ValueError("conversation_id is required for chat sharing.")

        from app.services.chat import (
            create_message,
            get_conversation_by_id,
            user_in_conversation,
        )

        conversation = await get_conversation_by_id(conversation_id)
        if conversation is None or not user_in_conversation(conversation, user):
            raise PermissionError("Conversation not found.")

        post_url = f"/posts/{post['_id']}"
        text = (
            f"Compartió una publicación de @{post['author_snapshot']['username']}: "
            f"{post.get('text', '')[:120]} {post_url}"
        ).strip()
        message = await create_message(conversation, user, text)
        message_id = str(message["_id"])

    updated_post = await db.posts.find_one_and_update(
        _post_query(post),
        {"$inc": {"stats.shares_count": 1}},
        return_document=ReturnDocument.AFTER,
    )

    return {
        "shared": True,
        "shares_count": max(0, (updated_post or post).get("stats", {}).get("shares_count", 0)),
        "message_id": message_id,
    }


async def list_repost_users(post_id: str, limit: int = 50) -> list[dict]:
    db = get_database()
    fetch_limit = min(max(limit, 1), 100)
    reposts = await (
        db.reposts.find({"post_id": post_id})
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )
    user_ids = [ObjectId(repost["user_id"]) for repost in reposts if ObjectId.is_valid(repost["user_id"])]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(len(user_ids)) if user_ids else []
    users_by_id = {str(user["_id"]): user for user in users}
    items = []
    for repost in reposts:
        user_data = users_by_id.get(repost["user_id"])
        if not user_data:
            continue
        items.append(
            {
                "id": str(user_data["_id"]),
                "username": user_data["username"],
                "display_name": user_data["display_name"],
                "avatar_url": user_data.get("avatar_url"),
                "city": user_data.get("city", ""),
                "reposted_at": repost["created_at"],
            }
        )
    return items


async def create_comment(post: dict, user: dict, text: str) -> dict:
    db = get_database()
    post_id = str(post["_id"])
    comment_doc = build_comment_document(post_id, user, text)
    result = await db.comments.insert_one(comment_doc)
    await db.posts.update_one(_post_query(post), {"$inc": {"stats.comments_count": 1}})
    created_comment = await db.comments.find_one({"_id": result.inserted_id})
    if created_comment is None:
        raise RuntimeError("Comment was created but could not be loaded.")
    await _notify_post_comment(post, user, created_comment)
    return created_comment


async def _notify_post_like(post: dict, actor: dict) -> None:
    from app.services.notifications import create_notification

    await create_notification(
        user_id=post["author_id"],
        actor=actor,
        type="like",
        title="Nuevo me gusta",
        body=f"{actor['display_name']} le dio me gusta a tu publicación",
        entity_type="post",
        entity_id=str(post["_id"]),
        dedupe=True,
    )


async def _notify_post_comment(post: dict, actor: dict, comment: dict) -> None:
    from app.services.notifications import create_notification

    await create_notification(
        user_id=post["author_id"],
        actor=actor,
        type="comment",
        title="Nuevo comentario",
        body=f"{actor['display_name']} comentó tu publicación",
        entity_type="comment",
        entity_id=str(comment["_id"]),
    )


async def _notify_post_repost(post: dict, actor: dict) -> None:
    from app.services.notifications import create_notification

    await create_notification(
        user_id=post["author_id"],
        actor=actor,
        type="repost",
        title="Nueva publicación compartida",
        body=f"{actor['display_name']} compartió tu publicación",
        entity_type="post",
        entity_id=str(post["_id"]),
        dedupe=True,
    )


async def get_comments(post_id: str, limit: int, cursor: str | None = None) -> tuple[list[dict], str | None]:
    db = get_database()
    query = {"post_id": post_id, "is_deleted": False}
    cursor_data = decode_comment_cursor(cursor)

    if cursor_data:
        cursor_created_at, cursor_id = cursor_data
        query["$or"] = [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "_id": {"$lt": cursor_id}},
        ]

    fetch_limit = min(max(limit, 1), 50)
    comments = await (
        db.comments.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit + 1)
        .to_list(fetch_limit + 1)
    )

    next_cursor = None
    if len(comments) > fetch_limit:
        next_cursor = encode_comment_cursor(comments[fetch_limit - 1])
        comments = comments[:fetch_limit]

    return comments, next_cursor


async def get_comment_by_id(comment_id: str) -> dict | None:
    if not ObjectId.is_valid(comment_id):
        return None

    db = get_database()
    return await db.comments.find_one({"_id": ObjectId(comment_id)})


async def soft_delete_comment(comment: dict) -> None:
    db = get_database()
    if comment.get("is_deleted"):
        return

    await db.comments.update_one(
        {"_id": comment["_id"]},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc)}},
    )
    await db.posts.update_one(
        {
            "_id": ObjectId(comment["post_id"]),
            "stats.comments_count": {"$gt": 0},
        },
        {"$inc": {"stats.comments_count": -1}},
    )
