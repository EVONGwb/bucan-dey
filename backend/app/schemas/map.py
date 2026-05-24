from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.post import AuthorSnapshot, EventData, LiveData, LocationData, PostStats, PostType


class MapPostOut(BaseModel):
    id: str
    type: PostType
    text: str
    author_snapshot: AuthorSnapshot
    location: LocationData
    event_data: EventData | None = None
    live_data: LiveData | None = None
    stats: PostStats
    created_at: datetime


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
