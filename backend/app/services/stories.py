from datetime import datetime, timezone

from bson import ObjectId

from app.core.database import get_database
from app.models.story import build_story_document
from app.schemas.story import StoryOut
from app.services.follows import is_following_user


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _story_user(snapshot: dict, author_id: str) -> dict:
    return {
        "id": author_id,
        "username": snapshot.get("username", ""),
        "display_name": snapshot.get("display_name", ""),
        "avatar_url": snapshot.get("avatar_url"),
        "city": snapshot.get("city", ""),
    }


def serialize_story(story: dict, viewed_by_me: bool = False) -> dict:
    return {
        "id": str(story["_id"]),
        "author_id": story["author_id"],
        "author_snapshot": story["author_snapshot"],
        "media": story["media"],
        "text": story.get("text", ""),
        "visibility": story.get("visibility", "global"),
        "location": story.get("location", {}),
        "views_count": int(story.get("views_count", 0)),
        "viewed_by_me": viewed_by_me,
        "expires_at": story["expires_at"],
        "created_at": story["created_at"],
    }


def _is_viewed_by(story: dict, user_id: str | None) -> bool:
    if not user_id:
        return False
    return any(viewer.get("user_id") == user_id for viewer in story.get("viewers", []))


async def can_view_story(story: dict, viewer: dict | None = None) -> bool:
    if story.get("expires_at") <= _now():
        return False

    if story.get("visibility") == "global":
        return True

    if viewer is None:
        return False

    viewer_id = str(viewer["_id"])
    author_id = story["author_id"]
    return viewer_id == author_id or await is_following_user(viewer_id, author_id)


async def create_story(payload, author: dict) -> dict:
    db = get_database()
    document = build_story_document(
        {
            "media": payload.media.model_dump(),
            "text": payload.text,
            "visibility": payload.visibility,
            "location": payload.location.model_dump() if payload.location else {},
        },
        author,
    )
    result = await db.stories.insert_one(document)
    story = await db.stories.find_one({"_id": result.inserted_id})
    if story is None:
        raise RuntimeError("Story was created but could not be loaded.")
    return story


async def get_story_by_id(story_id: str) -> dict | None:
    if not ObjectId.is_valid(story_id):
        return None
    db = get_database()
    return await db.stories.find_one({"_id": ObjectId(story_id)})


async def get_story_feed(viewer: dict | None = None, limit: int = 80) -> list[dict]:
    db = get_database()
    query = {"expires_at": {"$gt": _now()}}
    if viewer is None:
        query["visibility"] = "global"

    fetch_limit = min(max(limit, 1), 150)
    stories = await (
        db.stories.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )

    visible_stories = []
    for story in stories:
        if await can_view_story(story, viewer):
            visible_stories.append(story)

    viewer_id = str(viewer["_id"]) if viewer else None
    groups_by_author: dict[str, dict] = {}
    for story in visible_stories:
        author_id = story["author_id"]
        group = groups_by_author.setdefault(
            author_id,
            {
                "user": _story_user(story["author_snapshot"], author_id),
                "stories": [],
                "latest_created_at": story["created_at"],
            },
        )
        group["stories"].append(
            StoryOut(**serialize_story(story, viewed_by_me=_is_viewed_by(story, viewer_id)))
        )
        if story["created_at"] > group["latest_created_at"]:
            group["latest_created_at"] = story["created_at"]

    groups = list(groups_by_author.values())
    groups.sort(key=lambda group: group["latest_created_at"], reverse=True)
    for group in groups:
        group["stories"].sort(key=lambda story: story.created_at)
        group.pop("latest_created_at", None)
    return groups


async def register_story_view(story: dict, viewer: dict) -> dict:
    db = get_database()
    user_id = str(viewer["_id"])
    if story["author_id"] == user_id:
        return story

    already_viewed = _is_viewed_by(story, user_id)
    if already_viewed:
        return story

    await db.stories.update_one(
        {"_id": story["_id"], "viewers.user_id": {"$ne": user_id}},
        {
            "$push": {"viewers": {"user_id": user_id, "viewed_at": _now()}},
            "$inc": {"views_count": 1},
        },
    )
    updated_story = await db.stories.find_one({"_id": story["_id"]})
    return updated_story or story


async def delete_story(story: dict) -> None:
    db = get_database()
    await db.stories.delete_one({"_id": story["_id"]})


async def get_story_viewers(story: dict) -> list[dict]:
    db = get_database()
    viewers = story.get("viewers", [])
    user_ids = [
        ObjectId(viewer["user_id"])
        for viewer in viewers
        if ObjectId.is_valid(viewer.get("user_id", ""))
    ]
    if not user_ids:
        return []

    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(len(user_ids))
    users_by_id = {str(user["_id"]): user for user in users}
    items = []
    for viewer in viewers:
        user = users_by_id.get(viewer["user_id"])
        if not user:
            continue
        items.append(
            {
                "user_id": str(user["_id"]),
                "username": user["username"],
                "display_name": user["display_name"],
                "avatar_url": user.get("avatar_url"),
                "city": user.get("city", ""),
                "viewed_at": viewer["viewed_at"],
            }
        )
    items.sort(key=lambda item: item["viewed_at"], reverse=True)
    return items


async def to_story_out(story: dict, viewer: dict | None = None) -> StoryOut:
    viewer_id = str(viewer["_id"]) if viewer else None
    return StoryOut(**serialize_story(story, viewed_by_me=_is_viewed_by(story, viewer_id)))
