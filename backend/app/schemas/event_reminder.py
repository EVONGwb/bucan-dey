from datetime import datetime
from typing import Literal

from pydantic import BaseModel


ReminderType = Literal["one_hour", "fifteen_minutes"]
ReminderStatus = Literal["pending", "sent", "failed", "cancelled"]


class EventReminderOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    reminder_type: ReminderType
    scheduled_for: datetime
    sent_at: datetime | None = None
    status: ReminderStatus
    event_title: str | None = None
    username: str | None = None
    created_at: datetime


class EventRemindersResponse(BaseModel):
    items: list[EventReminderOut]
    next_cursor: str | None = None
