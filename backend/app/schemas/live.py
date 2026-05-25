from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.post import AuthorSnapshot, LocationData


LiveCategory = Literal["fiesta", "bar", "cumpleaños", "evento", "ambiente", "música", "otro"]
LiveProvider = Literal["livekit", "agora", "mux", "cloudflare"]
LiveVisibility = Literal["public", "followers"]
LiveEndedReason = Literal["manual", "timeout", "inactive", "admin", "network"]
LiveBitrateMode = Literal["low", "medium", "high", "auto"]
LiveModerationStatus = Literal["active", "flagged", "blocked"]
LiveHeartbeatRole = Literal["viewer", "streamer"]


class LiveStartRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    category: LiveCategory = "ambiente"
    thumbnail_url: str | None = Field(default=None, max_length=600)
    visibility: LiveVisibility = "public"
    bitrate_mode: LiveBitrateMode = "auto"
    max_duration_minutes: int | None = Field(default=None, ge=5, le=240)
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
    ended_reason: LiveEndedReason | None = None
    location: LocationData | dict = Field(default_factory=dict)
    viewers_count: int = 0
    peak_viewers: int = 0
    max_duration_minutes: int = 120
    total_watch_time_seconds: int = 0
    total_unique_viewers: int = 0
    bitrate_mode: LiveBitrateMode = "auto"
    moderation_status: LiveModerationStatus = "active"
    reports_count: int = 0
    last_heartbeat_at: datetime | None = None
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


class LiveHeartbeatIn(BaseModel):
    role: LiveHeartbeatRole = "viewer"


class LiveCommentIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class LiveReportIn(BaseModel):
    reason: str = Field(..., min_length=1, max_length=80)
    details: str = Field(default="", max_length=500)

    @field_validator("reason", "details")
    @classmethod
    def strip_report_text(cls, value: str) -> str:
        return value.strip()


class LiveStatsOut(BaseModel):
    current_viewers: int = 0
    peak_viewers: int = 0
    total_unique_viewers: int = 0
    total_watch_time_seconds: int = 0
    duration_seconds: int = 0


class LiveAdminUpdate(BaseModel):
    moderation_status: LiveModerationStatus | None = None
    end_live: bool | None = None
    ended_reason: LiveEndedReason | None = None
