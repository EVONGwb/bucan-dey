from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_optional_current_user, require_active_user
from app.schemas.story import StoryCreate, StoryGroupOut, StoryOut, StoryViewersResponse
from app.services.stories import (
    can_view_story,
    create_story,
    delete_story,
    get_story_by_id,
    get_story_feed,
    get_story_viewers,
    register_story_view,
    to_story_out,
)

router = APIRouter()


@router.post("", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create_story_endpoint(
    payload: StoryCreate,
    current_user: dict = Depends(require_active_user),
) -> StoryOut:
    story = await create_story(payload, current_user)
    return await to_story_out(story, current_user)


@router.get("/feed", response_model=list[StoryGroupOut])
async def get_story_feed_endpoint(
    limit: int = Query(default=80, ge=1, le=150),
    current_user: dict | None = Depends(get_optional_current_user),
) -> list[StoryGroupOut]:
    return await get_story_feed(current_user, limit=limit)


@router.get("/{story_id}", response_model=StoryOut)
async def get_story_endpoint(
    story_id: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> StoryOut:
    story = await get_story_by_id(story_id)
    if story is None or not await can_view_story(story, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")
    return await to_story_out(story, current_user)


@router.post("/{story_id}/view", response_model=StoryOut)
async def view_story_endpoint(
    story_id: str,
    current_user: dict = Depends(require_active_user),
) -> StoryOut:
    story = await get_story_by_id(story_id)
    if story is None or not await can_view_story(story, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")
    updated_story = await register_story_view(story, current_user)
    return await to_story_out(updated_story, current_user)


@router.delete("/{story_id}")
async def delete_story_endpoint(
    story_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    story = await get_story_by_id(story_id)
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")

    is_owner = story["author_id"] == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"
    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    await delete_story(story)
    return {"message": "Story deleted"}


@router.get("/{story_id}/viewers", response_model=StoryViewersResponse)
async def get_story_viewers_endpoint(
    story_id: str,
    current_user: dict = Depends(require_active_user),
) -> StoryViewersResponse:
    story = await get_story_by_id(story_id)
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")

    if story["author_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    return StoryViewersResponse(items=await get_story_viewers(story))
