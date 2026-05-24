from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ParticipantSnapshot(BaseModel):
    user_id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    city: str = ""


class SenderSnapshot(BaseModel):
    username: str
    display_name: str
    avatar_url: str | None = None


class LastMessage(BaseModel):
    text: str
    sender_id: str
    created_at: datetime


class ConversationCreate(BaseModel):
    user_id: str


class ConversationOut(BaseModel):
    id: str
    participant_ids: list[str]
    participant_snapshots: list[ParticipantSnapshot]
    other_user: ParticipantSnapshot
    last_message: LastMessage | None = None
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime


class ConversationsResponse(BaseModel):
    items: list[ConversationOut]


class MessageCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Message text is required.")
        return text


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_snapshot: SenderSnapshot
    text: str
    media_url: str | None = None
    read_by: list[str] = Field(default_factory=list)
    is_deleted: bool = False
    created_at: datetime


class MessagesResponse(BaseModel):
    items: list[MessageOut]
    next_cursor: str | None = None
