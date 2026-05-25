from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ActorSnapshot(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""


class NotificationOut(BaseModel):
    id: str
    user_id: str
    actor_id: str
    actor_snapshot: ActorSnapshot
    type: Literal[
        "like",
        "comment",
        "message",
        "conversation",
        "follow",
        "repost",
        "event_attend",
        "event_reminder",
        "live_started",
    ]
    title: str
    body: str
    entity_type: Literal["post", "comment", "message", "conversation", "user", "event", "live"]
    entity_id: str
    is_read: bool
    created_at: datetime


class NotificationsResponse(BaseModel):
    items: list[NotificationOut]
    next_cursor: str | None = None


class UnreadCountResponse(BaseModel):
    unread_count: int
