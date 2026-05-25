from datetime import datetime, timedelta, timezone

from app.core.database import get_database
from app.services.follows import serialize_follow_user
from app.services.posts import add_interaction_flags, serialize_post


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _age_days(value: datetime) -> float:
    created_at = value
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return max(0, (_utc_now() - created_at).total_seconds() / 86400)


def _post_score(post: dict) -> float:
    stats = post.get("stats", {})
    recency = max(0, 7 - _age_days(post["created_at"])) * 2
    return (
        float(stats.get("likes_count", 0)) * 2
        + float(stats.get("comments_count", 0)) * 3
        + float(stats.get("reposts_count", 0)) * 4
        + float(stats.get("shares_count", 0)) * 2
        + float(stats.get("views_count", 0))
        + recency
    )


async def trending_posts(viewer: dict | None = None, limit: int = 20) -> list[dict]:
    db = get_database()
    since = _utc_now() - timedelta(days=7)
    fetch_limit = min(max(limit, 1), 50)
    posts = await (
        db.posts.find(
            {
                "visibility": "global",
                "is_deleted": False,
                "is_hidden": False,
                "created_at": {"$gte": since},
            }
        )
        .sort([("created_at", -1), ("_id", -1)])
        .limit(200)
        .to_list(200)
    )
    posts.sort(key=_post_score, reverse=True)
    posts = posts[:fetch_limit]
    posts_with_flags = await add_interaction_flags(posts, viewer)
    return [
        {
            **serialize_post(post, liked_by_me=liked_by_me, reposted_by_me=reposted_by_me),
            "trend_score": round(_post_score(post), 2),
        }
        for post, liked_by_me, reposted_by_me in posts_with_flags
    ]


async def trending_users(viewer: dict | None = None, limit: int = 20) -> list[dict]:
    db = get_database()
    since = _utc_now() - timedelta(days=7)
    fetch_limit = min(max(limit, 1), 50)
    users = await (
        db.users.find({"is_active": True})
        .sort([("followers_count", -1), ("created_at", -1)])
        .limit(fetch_limit * 3)
        .to_list(fetch_limit * 3)
    )

    items = []
    for user in users:
        if viewer is not None and str(user["_id"]) == str(viewer["_id"]):
            continue

        posts_count = await db.posts.count_documents(
            {
                "author_id": str(user["_id"]),
                "visibility": "global",
                "is_deleted": False,
                "is_hidden": False,
                "created_at": {"$gte": since},
            }
        )
        trend_score = float(user.get("followers_count", 0)) * 2 + posts_count * 3
        items.append(
            {
                **await serialize_follow_user(user, viewer),
                "posts_count": posts_count,
                "trend_score": round(trend_score, 2),
            }
        )

    items.sort(key=lambda item: item["trend_score"], reverse=True)
    return items[:fetch_limit]


async def trending_places(limit: int = 20) -> list[dict]:
    db = get_database()
    since = _utc_now() - timedelta(days=7)
    output_limit = min(max(limit, 1), 50)
    pipeline = [
        {
            "$match": {
                "visibility": "global",
                "is_deleted": False,
                "is_hidden": False,
                "created_at": {"$gte": since},
                "location.show_on_map": True,
                "location.city": {"$ne": ""},
            }
        },
        {
            "$group": {
                "_id": {
                    "city": {"$ifNull": ["$location.city", ""]},
                    "area": {"$ifNull": ["$location.area", ""]},
                },
                "posts_count": {"$sum": 1},
                "event_count": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$type", ["evento", "fiesta", "cumpleaños"]]},
                            1,
                            0,
                        ]
                    }
                },
                "live_count": {
                    "$sum": {"$cond": [{"$eq": ["$type", "live"]}, 1, 0]}
                },
                "bar_count": {
                    "$sum": {"$cond": [{"$eq": ["$type", "bar"]}, 1, 0]}
                },
            }
        },
        {
            "$project": {
                "_id": 0,
                "city": "$_id.city",
                "area": "$_id.area",
                "posts_count": 1,
                "score": {
                    "$add": [
                        "$posts_count",
                        {"$multiply": ["$event_count", 3]},
                        {"$multiply": ["$live_count", 4]},
                        {"$multiply": ["$bar_count", 2]},
                    ]
                },
            }
        },
        {"$sort": {"score": -1, "posts_count": -1}},
        {"$limit": output_limit},
    ]
    places = await db.posts.aggregate(pipeline).to_list(output_limit)
    by_key = {(item.get("city", ""), item.get("area", "")): item for item in places}
    lives = await db.lives.find(
        {
            "visibility": "public",
            "is_live": True,
            "moderation_status": {"$ne": "blocked"},
            "started_at": {"$gte": since},
            "location.show_on_map": True,
            "location.city": {"$ne": ""},
        }
    ).to_list(200)
    for live in lives:
        location = live.get("location") or {}
        key = (location.get("city", ""), location.get("area", ""))
        if key not in by_key:
            by_key[key] = {
                "city": key[0],
                "area": key[1],
                "posts_count": 0,
                "score": 0,
            }
        by_key[key]["posts_count"] += 1
        by_key[key]["score"] += 8 + int(live.get("viewers_count", 0)) * 2

    return sorted(
        by_key.values(),
        key=lambda item: (item["score"], item["posts_count"]),
        reverse=True,
    )[:output_limit]
