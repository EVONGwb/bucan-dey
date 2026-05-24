from typing import Any

from app.core.database import get_database
from app.schemas.map import AmbientZoneOut, MapPostOut
from app.schemas.post import PostType
from app.services.posts import serialize_post


MAP_TYPES = {"fiesta", "cumpleaños", "evento", "live", "bar", "ambiente", "video", "normal"}
EVENT_TYPES = {"fiesta", "cumpleaños", "evento"}


def map_query(city: str | None = None, post_type: str | None = None) -> dict[str, Any]:
    query: dict[str, Any] = {
        "visibility": "global",
        "is_deleted": False,
        "is_hidden": False,
        "location.show_on_map": True,
        "location.lat": {"$type": "number"},
        "location.lng": {"$type": "number"},
    }

    if city:
        query["location.city"] = {"$regex": f"^{city.strip()}$", "$options": "i"}

    if post_type and post_type in MAP_TYPES:
        query["type"] = post_type

    return query


def to_map_post_out(post: dict) -> MapPostOut:
    data = serialize_post(post)
    return MapPostOut(
        id=data["id"],
        type=data["type"],
        text=data["text"],
        author_snapshot=data["author_snapshot"],
        location=data["location"],
        event_data=data["event_data"],
        live_data=data["live_data"],
        stats=data["stats"],
        created_at=data["created_at"],
    )


async def get_map_posts(
    city: str | None = None,
    post_type: PostType | None = None,
    limit: int = 100,
) -> list[dict]:
    db = get_database()
    fetch_limit = min(max(limit, 1), 200)
    return await (
        db.posts.find(map_query(city=city, post_type=post_type))
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit)
        .to_list(fetch_limit)
    )


def heat_level(posts_count: int) -> str:
    if posts_count >= 11:
        return "very_high"
    if posts_count >= 6:
        return "high"
    if posts_count >= 3:
        return "medium"
    return "low"


async def get_ambient_zones() -> list[AmbientZoneOut]:
    posts = await get_map_posts(limit=200)
    zones: dict[tuple[str, str], dict[str, int | str]] = {}

    for post in posts:
        location = post.get("location", {})
        city = location.get("city") or "Sin ciudad"
        area = location.get("area") or "Sin zona"
        key = (city, area)

        if key not in zones:
            zones[key] = {
                "city": city,
                "area": area,
                "posts_count": 0,
                "live_count": 0,
                "event_count": 0,
            }

        zones[key]["posts_count"] += 1
        if post.get("type") == "live":
            zones[key]["live_count"] += 1
        if post.get("type") in EVENT_TYPES:
            zones[key]["event_count"] += 1

    return [
        AmbientZoneOut(
            city=str(zone["city"]),
            area=str(zone["area"]),
            posts_count=int(zone["posts_count"]),
            live_count=int(zone["live_count"]),
            event_count=int(zone["event_count"]),
            heat_level=heat_level(int(zone["posts_count"])),
        )
        for zone in sorted(
            zones.values(),
            key=lambda item: int(item["posts_count"]),
            reverse=True,
        )
    ]
