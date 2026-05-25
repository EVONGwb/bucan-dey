from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.post import AuthorSnapshot, EventData, LiveData, LocationData, PostStats, PostType


MapItemType = Literal[
    "normal",
    "video",
    "fiesta",
    "cumpleaños",
    "evento",
    "live",
    "bar",
    "ambiente",
    "concierto",
    "meetup",
    "deporte",
    "otro",
]


class MapPostOut(BaseModel):
    id: str
    source_type: Literal["post", "event"] = "post"
    type: MapItemType
    text: str
    author_snapshot: AuthorSnapshot
    location: LocationData
    event_data: EventData | None = None
    live_data: LiveData | None = None
    stats: PostStats
    attendees_count: int = 0
    created_at: datetime
    distance_km: float | None = None


class MapPostsResponse(BaseModel):
    items: list[MapPostOut]


class AmbientZoneOut(BaseModel):
    city: str
    area: str
    posts_count: int
    live_count: int
    event_count: int
    heat_level: Literal["low", "medium", "high", "very_high"]


class AmbientResponse(BaseModel):
    zones: list[AmbientZoneOut]
