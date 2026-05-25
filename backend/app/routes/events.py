from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_optional_current_user, require_active_user
from app.schemas.event import (
    AttendRequest,
    AttendResponse,
    EventAttendeesResponse,
    EventCreate,
    EventOut,
    EventShareResponse,
    EventsResponse,
    EventUpdate,
)
from app.services.events import (
    add_attendance,
    cancel_event,
    can_view_event,
    create_event,
    get_event_by_id,
    list_attendees,
    list_events,
    remove_attendance,
    share_event,
    to_event_out,
    update_event,
)


router = APIRouter()


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event_endpoint(
    payload: EventCreate,
    current_user: dict = Depends(require_active_user),
) -> EventOut:
    event = await create_event(payload, current_user)
    return await to_event_out(event, current_user)


@router.get("", response_model=EventsResponse)
async def list_events_endpoint(
    category: str | None = None,
    city: str | None = None,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, ge=0.1, le=100),
    featured: bool | None = None,
    upcoming: bool = True,
    limit: int = Query(default=40, ge=1, le=100),
    current_user: dict | None = Depends(get_optional_current_user),
) -> EventsResponse:
    events = await list_events(
        viewer=current_user,
        category=category,
        city=city,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        featured=featured,
        upcoming=upcoming,
        limit=limit,
    )
    return EventsResponse(items=[await to_event_out(event, current_user) for event in events])


@router.get("/{event_id}", response_model=EventOut)
async def get_event_endpoint(
    event_id: str,
    current_user: dict | None = Depends(get_optional_current_user),
) -> EventOut:
    event = await get_event_by_id(event_id)
    if event is None or not await can_view_event(event, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return await to_event_out(event, current_user)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event_endpoint(
    event_id: str,
    payload: EventUpdate,
    current_user: dict = Depends(require_active_user),
) -> EventOut:
    event = await get_event_by_id(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if event["creator_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    if current_user.get("role") != "admin":
        payload.is_featured = None

    updated = await update_event(event, payload)
    return await to_event_out(updated, current_user)


@router.delete("/{event_id}")
async def delete_event_endpoint(
    event_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    event = await get_event_by_id(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if event["creator_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    await cancel_event(event)
    return {"message": "Event cancelled"}


@router.post("/{event_id}/attend", response_model=AttendResponse)
async def attend_event_endpoint(
    event_id: str,
    payload: AttendRequest,
    current_user: dict = Depends(require_active_user),
) -> AttendResponse:
    event = await get_event_by_id(event_id)
    if event is None or not await can_view_event(event, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return AttendResponse(**await add_attendance(event, current_user, payload.status))


@router.delete("/{event_id}/attend", response_model=AttendResponse)
async def remove_attendance_endpoint(
    event_id: str,
    current_user: dict = Depends(require_active_user),
) -> AttendResponse:
    event = await get_event_by_id(event_id)
    if event is None or not await can_view_event(event, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return AttendResponse(**await remove_attendance(event, current_user))


@router.get("/{event_id}/attendees", response_model=EventAttendeesResponse)
async def attendees_endpoint(
    event_id: str,
    limit: int = Query(default=80, ge=1, le=100),
    current_user: dict | None = Depends(get_optional_current_user),
) -> EventAttendeesResponse:
    event = await get_event_by_id(event_id)
    if event is None or not await can_view_event(event, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return EventAttendeesResponse(items=await list_attendees(event, limit=limit))


@router.post("/{event_id}/share", response_model=EventShareResponse)
async def share_event_endpoint(event_id: str) -> EventShareResponse:
    event = await get_event_by_id(event_id)
    if event is None or event.get("is_cancelled") or event.get("visibility") != "public":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return EventShareResponse(**await share_event(event))
