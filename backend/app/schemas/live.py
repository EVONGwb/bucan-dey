from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.post import AuthorSnapshot, LocationData


LiveCategory = Literal["fiesta", "bar", "cumpleaños", "evento", "ambiente", "música", "otro"]
LiveProvider = Literal["livekit", "agora", "mux", "cloudflare"]
LiveVisibility = Literal["public", "followers"]


class LiveStartRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    category: LiveCategory = "ambiente"
    thumbnail_url: str | None = Field(default=None, max_length=600)
    visibility: LiveVisibility = "public"
    location: LocationData | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class LiveOut(BaseModel):
    id: str
    creator_id: str
    creator_snapshot: AuthorSnapshot
    title: str
    description: str = ""
    category: LiveCategory
    thumbnail_url: str | None = None
    provider: LiveProvider
    room_id: str
    playback_url: str | None = None
    is_live: bool
    started_at: datetime | None = None
    ended_at: datetime | None = None
    location: LocationData | dict = Field(default_factory=dict)
    viewers_count: int = 0
    peak_viewers: int = 0
    visibility: LiveVisibility
    created_at: datetime
    updated_at: datetime


class LiveStartResponse(BaseModel):
    live: LiveOut
    token: str
    room_id: str
    livekit_url: str
    playback_url: str | None = None


class LivesResponse(BaseModel):
    items: list[LiveOut]


class LiveViewerResponse(BaseModel):
    viewers_count: int
    peak_viewers: int


class LiveCommentIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()
