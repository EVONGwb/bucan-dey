from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_optional_current_user, require_active_user
from app.schemas.live import (
    LiveCommentIn,
    LiveOut,
    LivesResponse,
    LiveStartRequest,
    LiveStartResponse,
    LiveViewerResponse,
)
from app.services.lives import (
    can_view_live,
    end_live,
    get_join_token,
    get_live_by_id,
    heartbeat_viewer,
    list_lives,
    register_viewer,
    send_live_comment,
    start_live,
    to_live_out,
)


router = APIRouter()


@router.post("/start", response_model=LiveStartResponse, status_code=status.HTTP_201_CREATED)
async def start_live_endpoint(
    payload: LiveStartRequest,
    current_user: dict = Depends(require_active_user),
) -> LiveStartResponse:
    return LiveStartResponse(**await start_live(payload, current_user))


@router.get("", response_model=LivesResponse)
async def list_lives_endpoint(
    category: str | None = None,
    city: str | None = None,
    following_only: bool = False,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    limit: int = Query(default=40, ge=1, le=100),
    current_user: dict | None = Depends(get_optional_current_user),
) -> LivesResponse:
    lives = await list_lives(
        viewer=current_user,
        category=category,
        city=city,
        following_only=following_only,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        limit=limit,
    )
    return LivesResponse(items=[to_live_out(live) for live in lives])


@router.get("/{live_id}", response_model=LiveOut)
async def get_live_endpoint(
    live_id: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> LiveOut:
    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return to_live_out(live)


@router.post("/{live_id}/join")
async def join_live_endpoint(
    live_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict:
    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return await get_join_token(live, current_user)


@router.post("/{live_id}/end", response_model=LiveOut)
async def end_live_endpoint(
    live_id: str,
    current_user: dict = Depends(require_active_user),
) -> LiveOut:
    live = await get_live_by_id(live_id)
    if live is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return to_live_out(await end_live(live, current_user))


@router.post("/{live_id}/viewer", response_model=LiveViewerResponse)
async def register_viewer_endpoint(
    live_id: str,
    current_user: dict = Depends(require_active_user),
) -> LiveViewerResponse:
    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return LiveViewerResponse(**await register_viewer(live, current_user))


@router.post("/{live_id}/heartbeat", response_model=LiveViewerResponse)
async def heartbeat_live_endpoint(
    live_id: str,
    current_user: dict = Depends(require_active_user),
) -> LiveViewerResponse:
    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return LiveViewerResponse(**await heartbeat_viewer(live, current_user))


@router.post("/{live_id}/comments")
async def live_comment_endpoint(
    live_id: str,
    payload: LiveCommentIn,
    current_user: dict = Depends(require_active_user),
) -> dict:
    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    return await send_live_comment(live, current_user, payload.text)
