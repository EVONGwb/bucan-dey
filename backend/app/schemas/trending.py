from pydantic import BaseModel

from app.schemas.post import PostOut
from app.schemas.user import FollowUserOut


class TrendingPostOut(PostOut):
    trend_score: float = 0


class TrendingPostsResponse(BaseModel):
    items: list[TrendingPostOut]


class TrendingUserOut(FollowUserOut):
    posts_count: int = 0
    trend_score: float = 0


class TrendingUsersResponse(BaseModel):
    items: list[TrendingUserOut]


class TrendingPlaceOut(BaseModel):
    city: str
    area: str
    score: float
    posts_count: int


class TrendingPlacesResponse(BaseModel):
    places: list[TrendingPlaceOut]
