from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.post import AuthorSnapshot


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Comment text is required.")
        return text


class CommentOut(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_snapshot: AuthorSnapshot
    text: str
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime


class CommentsResponse(BaseModel):
    items: list[CommentOut]
    next_cursor: str | None = None


class LikeResponse(BaseModel):
    liked: bool
    likes_count: int
