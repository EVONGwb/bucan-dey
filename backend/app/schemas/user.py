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


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=400)
    bio: str | None = Field(default=None, max_length=220)
    city: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    email: EmailStr
    avatar_url: str | None = None
    bio: str = ""
    city: str = ""
    country: str = ""
    role: Literal["user", "admin"] = "user"
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
