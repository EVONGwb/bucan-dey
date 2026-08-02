from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    display_name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    city: str | None = Field(default="", max_length=80)
    country: str | None = Field(default="", max_length=80)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip().lower()
        if not username.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, dots and underscores.")
        return username

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("display_name", "city", "country")
    @classmethod
    def strip_text(cls, value: str | None) -> str:
        return (value or "").strip()


class UserLogin(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        return value.strip().lower()


class GoogleLogin(BaseModel):
    id_token: str = Field(..., min_length=20)


class UserOnboardingUpdate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    display_name: str = Field(..., min_length=1, max_length=80)
    city: str = Field(..., min_length=1, max_length=80)
    country: str = Field(..., min_length=1, max_length=80)
    bio: str = Field(default="", max_length=300)
    avatar_url: str | None = Field(default=None, max_length=400)
    profile_type: Literal["artist", "music_group", "business", "person", "creator", "venue"] = "person"
    social_links: dict[str, str] = Field(default_factory=dict)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip().lower()
        if not username.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, dots and underscores.")
        return username

    @field_validator("display_name", "city", "country", "bio")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("avatar_url")
    @classmethod
    def strip_avatar_url(cls, value: str | None) -> str | None:
        return value.strip() if value else None

    @field_validator("social_links")
    @classmethod
    def normalize_social_links(cls, value: dict[str, str]) -> dict[str, str]:
        allowed = {"instagram", "tiktok", "youtube", "spotify", "website", "whatsapp"}
        cleaned: dict[str, str] = {}
        for key, raw in (value or {}).items():
            normalized_key = key.strip().lower()
            if normalized_key not in allowed:
                continue
            link = str(raw or "").strip()
            if link:
                cleaned[normalized_key] = link[:400]
        return cleaned


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=400)
    bio: str | None = Field(default=None, max_length=220)
    city: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)
    profile_type: Literal["artist", "music_group", "business", "person", "creator", "venue"] | None = None
    social_links: dict[str, str] | None = None


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    email: EmailStr
    avatar_url: str | None = None
    bio: str = ""
    city: str = ""
    country: str = ""
    profile_type: Literal["artist", "music_group", "business", "person", "creator", "venue"] = "person"
    social_links: dict[str, str] = Field(default_factory=dict)
    role: Literal["user", "admin"] = "user"
    google_id: str | None = None
    auth_provider: Literal["local", "google", "apple"] = "local"
    providers: list[str] = Field(default_factory=list)
    onboarding_completed: bool = False
    onboarding_completed_at: datetime | None = None
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class FollowResponse(BaseModel):
    following: bool
    followers_count: int


class FollowUserOut(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""
    country: str = ""
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False


class FollowListResponse(BaseModel):
    items: list[FollowUserOut]
    next_cursor: str | None = None


class UserRankingMetrics(BaseModel):
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    likes_received: int = 0
    comments_received: int = 0
    reposts_received: int = 0
    shares_received: int = 0
    views_received: int = 0


class UserRankingOut(BaseModel):
    username: str
    display_name: str
    city: str = ""
    country: str = ""
    score: float
    rank_label: str
    level: int
    progress: int
    global_rank: int
    global_total: int
    city_rank: int
    city_total: int
    metrics: UserRankingMetrics
