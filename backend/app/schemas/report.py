from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ReportTargetType = Literal["post", "user", "comment"]
ReportStatus = Literal["pending", "reviewed", "resolved", "dismissed"]


class ReporterSnapshot(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: str
    reason: str = Field(..., min_length=1, max_length=80)
    details: str = Field(default="", max_length=500)

    @field_validator("reason", "details")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class ReportUpdate(BaseModel):
    status: ReportStatus


class ReportOut(BaseModel):
    id: str
    reporter_id: str
    reporter_snapshot: ReporterSnapshot
    target_type: ReportTargetType
    target_id: str
    reason: str
    details: str = ""
    status: ReportStatus
    created_at: datetime
    updated_at: datetime


class ReportsResponse(BaseModel):
    items: list[ReportOut]
    next_cursor: str | None = None


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_verified: bool | None = None
    role: Literal["user", "admin"] | None = None


class AdminPostModerate(BaseModel):
    is_hidden: bool
    reason: str = Field(default="", max_length=300)


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_posts: int
    global_posts: int
    hidden_posts: int
    total_comments: int
    total_reports: int
    pending_reports: int
