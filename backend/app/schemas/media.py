from typing import Literal

from pydantic import BaseModel


class MediaUploadOut(BaseModel):
    url: str
    type: Literal["image", "video"]
    thumbnail_url: str | None = None
    public_id: str
