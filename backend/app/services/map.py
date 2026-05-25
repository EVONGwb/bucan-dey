import math
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_database
from app.schemas.map import AmbientZoneOut, MapPostOut
from app.schemas.post import PostType
from app.services.posts import serialize_post


MAP_TYPES = {"fiesta", "cumpleaños", "evento", "live", "bar", "ambiente", "video", "normal"}
EVENT_MAP_TYPES = {"fiesta", "cumpleaños", "concierto", "bar", "evento", "meetup", "deporte", "otro"}
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


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def to_map_post_out(post: dict) -> MapPostOut:
    if post.get("source_type") == "event":
        location = post.get("location") or {}
        distance_km = post.get("distance_km")
        return MapPostOut(
            id=str(post["_id"]),
            source_type="event",
            type=post.get("category", "evento"),
            text=post.get("description") or post.get("title", ""),
            author_snapshot=post["creator_snapshot"],
            location={
                "city": location.get("city", ""),
                "area": location.get("area", ""),
                "lat": location.get("lat"),
                "lng": location.get("lng"),
                "show_on_map": True,
            },
            event_data={
                "title": post.get("title", ""),
                "start_at": post.get("start_at"),
                "end_at": post.get("end_at"),
                "venue": location.get("venue_name", ""),
                "price": "",
                "is_open": True,
            },
            live_data=None,
            stats={
                "likes_count": 0,
                "comments_count": 0,
                "views_count": 0,
                "reposts_count": 0,
                "shares_count": max(0, int(post.get("shares_count", 0))),
            },
            attendees_count=max(0, int(post.get("attendees_count", 0))),
            created_at=post["created_at"],
            distance_km=round(float(distance_km), 1) if distance_km is not None else None,
        )

    data = serialize_post(post)
    distance_km = post.get("distance_km")
    return MapPostOut(
        id=data["id"],
        source_type="post",
        type=data["type"],
        text=data["text"],
        author_snapshot=data["author_snapshot"],
        location=data["location"],
        event_data=data["event_data"],
        live_data=data["live_data"],
        stats=data["stats"],
        attendees_count=0,
        created_at=data["created_at"],
        distance_km=round(float(distance_km), 1) if distance_km is not None else None,
    )


async def get_map_posts(
    city: str | None = None,
    post_type: PostType | None = None,
    limit: int = 100,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
) -> list[dict]:
    db = get_database()
    fetch_limit = min(max(limit, 1), 200)
    has_nearby = lat is not None and lng is not None and radius_km is not None
    query = map_query(city=city, post_type=post_type)

    posts = await (
        db.posts.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit if not has_nearby else min(fetch_limit * 8, 1000))
        .to_list(fetch_limit if not has_nearby else min(fetch_limit * 8, 1000))
    )

    event_query: dict[str, Any] = {
        "visibility": "public",
        "is_cancelled": False,
        "location.lat": {"$type": "number"},
        "location.lng": {"$type": "number"},
        "start_at": {"$gte": datetime.now(timezone.utc)},
    }
    if city:
        event_query["location.city"] = {"$regex": f"^{city.strip()}$", "$options": "i"}
    if post_type and post_type in EVENT_MAP_TYPES and post_type != "evento":
        event_query["category"] = post_type
    elif post_type and post_type not in {"evento", *MAP_TYPES}:
        event_query["category"] = post_type

    events = await (
        db.events.find(event_query)
        .sort([("start_at", 1), ("created_at", -1)])
        .limit(fetch_limit if not has_nearby else min(fetch_limit * 4, 400))
        .to_list(fetch_limit if not has_nearby else min(fetch_limit * 4, 400))
    )
    for event in events:
        event["source_type"] = "event"

    combined = posts + events

    if not has_nearby:
        combined.sort(key=lambda item: item.get("created_at"), reverse=True)
        return combined[:fetch_limit]

    radius = max(0.1, min(float(radius_km), 50.0))
    nearby_posts = []
    for post in combined:
        location = post.get("location", {})
        post_lat = location.get("lat")
        post_lng = location.get("lng")
        if not isinstance(post_lat, (int, float)) or not isinstance(post_lng, (int, float)):
            continue

        distance = haversine_km(float(lat), float(lng), float(post_lat), float(post_lng))
        if distance <= radius:
            post["distance_km"] = distance
            nearby_posts.append(post)

    nearby_posts.sort(key=lambda item: (item.get("distance_km", 0), -item["created_at"].timestamp()))
    return nearby_posts[:fetch_limit]


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
