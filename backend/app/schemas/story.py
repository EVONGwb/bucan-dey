from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.post import AuthorSnapshot, LocationData, MediaItem


StoryVisibility = Literal["global", "followers"]


class StoryCreate(BaseModel):
    media: MediaItem
    text: str = Field(default="", max_length=300)
    visibility: StoryVisibility = "global"
    location: LocationData | None = None

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class StoryOut(BaseModel):
    id: str
    author_id: str
    author_snapshot: AuthorSnapshot
    media: MediaItem
    text: str = ""
    visibility: StoryVisibility
    location: LocationData | dict = Field(default_factory=dict)
    views_count: int = 0
    viewed_by_me: bool = False
    expires_at: datetime
    created_at: datetime


class StoryUserOut(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""


class StoryGroupOut(BaseModel):
    user: StoryUserOut
    stories: list[StoryOut]


class StoryViewerOut(BaseModel):
    user_id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""
    viewed_at: datetime


class StoryViewersResponse(BaseModel):
    items: list[StoryViewerOut]
