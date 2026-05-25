from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.post import AuthorSnapshot, MediaItem


EventCategory = Literal[
    "fiesta",
    "cumpleaños",
    "concierto",
    "bar",
    "evento",
    "meetup",
    "deporte",
    "otro",
]
EventVisibility = Literal["public", "followers"]
AttendanceStatus = Literal["going", "interested"]


class EventLocation(BaseModel):
    city: str = Field(default="", max_length=80)
    area: str = Field(default="", max_length=80)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    geo: dict | None = None
    venue_name: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=180)

    @field_validator("city", "area", "venue_name", "address")
    @classmethod
    def strip_location_text(cls, value: str | None) -> str:
        return (value or "").strip()


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=1200)
    category: EventCategory = "evento"
    cover_media: MediaItem | None = None
    location: EventLocation
    start_at: datetime
    end_at: datetime | None = None
    visibility: EventVisibility = "public"

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_dates(self) -> "EventCreate":
        if self.end_at and self.end_at <= self.start_at:
            raise ValueError("End date must be after start date.")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, max_length=1200)
    category: EventCategory | None = None
    cover_media: MediaItem | None = None
    location: EventLocation | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    visibility: EventVisibility | None = None
    is_featured: bool | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


class EventOut(BaseModel):
    id: str
    creator_id: str
    creator_snapshot: AuthorSnapshot
    title: str
    description: str
    category: EventCategory
    cover_media: MediaItem | None = None
    location: EventLocation
    start_at: datetime
    end_at: datetime | None = None
    visibility: EventVisibility
    attendees_count: int
    interested_count: int
    shares_count: int = 0
    is_featured: bool
    is_cancelled: bool
    my_attendance_status: AttendanceStatus | None = None
    distance_km: float | None = None
    created_at: datetime
    updated_at: datetime


class EventsResponse(BaseModel):
    items: list[EventOut]


class AttendRequest(BaseModel):
    status: AttendanceStatus


class AttendResponse(BaseModel):
    status: AttendanceStatus | None
    attendees_count: int
    interested_count: int


class EventAttendeeOut(BaseModel):
    user_id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""
    status: AttendanceStatus
    created_at: datetime


class EventAttendeesResponse(BaseModel):
    items: list[EventAttendeeOut]


class EventShareResponse(BaseModel):
    shared: bool
    shares_count: int
