from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


PostType = Literal[
    "normal",
    "video",
    "fiesta",
    "cumpleaños",
    "evento",
    "live",
    "bar",
    "ambiente",
]
PostVisibility = Literal["global", "profile_only", "private"]
MediaType = Literal["image", "video"]


class AuthorSnapshot(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""


class MediaItem(BaseModel):
    url: str = Field(..., min_length=1, max_length=600)
    type: MediaType
    thumbnail_url: str | None = Field(default=None, max_length=600)
    public_id: str | None = Field(default=None, max_length=300)


class LocationData(BaseModel):
    city: str | None = Field(default="", max_length=80)
    area: str | None = Field(default="", max_length=80)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    show_on_map: bool = False
    geo: dict | None = None

    @field_validator("city", "area")
    @classmethod
    def strip_text(cls, value: str | None) -> str:
        return (value or "").strip()


class EventData(BaseModel):
    title: str | None = Field(default="", max_length=120)
    start_at: datetime | None = None
    end_at: datetime | None = None
    venue: str | None = Field(default="", max_length=120)
    price: str | None = Field(default="", max_length=80)
    is_open: bool = True

    @field_validator("title", "venue", "price")
    @classmethod
    def strip_text(cls, value: str | None) -> str:
        return (value or "").strip()


class LiveData(BaseModel):
    is_live: bool = False
    started_at: datetime | None = None
    ended_at: datetime | None = None
    stream_url: str | None = Field(default=None, max_length=600)


class PostStats(BaseModel):
    likes_count: int = 0
    comments_count: int = 0
    views_count: int = 0


class PostCreate(BaseModel):
    type: PostType = "normal"
    visibility: PostVisibility = "global"
    text: str = Field(default="", max_length=1000)
    media: list[MediaItem] = Field(default_factory=list)
    location: LocationData | None = None
    event_data: EventData | None = None
    live_data: LiveData | None = None

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def require_text_or_media(self) -> "PostCreate":
        if not self.text and not self.media:
            raise ValueError("Text is required when media is empty.")
        return self


class PostUpdate(BaseModel):
    type: PostType | None = None
    visibility: PostVisibility | None = None
    text: str | None = Field(default=None, max_length=1000)
    location: LocationData | None = None
    event_data: EventData | None = None

    @field_validator("text")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


class PostOut(BaseModel):
    id: str
    author_id: str
    author_snapshot: AuthorSnapshot
    type: PostType
    visibility: PostVisibility
    text: str
    media: list[MediaItem] = Field(default_factory=list)
    location: LocationData | dict = Field(default_factory=dict)
    event_data: EventData | None = None
    live_data: LiveData | None = None
    stats: PostStats
    is_deleted: bool
    is_hidden: bool
    liked_by_me: bool = False
    created_at: datetime
    updated_at: datetime


class FeedResponse(BaseModel):
    items: list[PostOut]
    next_cursor: str | None = None
