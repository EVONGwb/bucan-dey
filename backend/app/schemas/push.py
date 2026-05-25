from datetime import datetime

from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1)
    auth: str = Field(min_length=1)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=1)
    keys: PushKeys


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1)


class PushSubscriptionOut(BaseModel):
    endpoint: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class PushTestResponse(BaseModel):
    sent: int
