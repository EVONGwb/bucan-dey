from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_admin_user
from app.schemas.event_reminder import EventRemindersResponse, ReminderStatus
from app.schemas.live import LiveAdminUpdate, LiveOut, LiveModerationStatus
from app.schemas.post import PostOut, PostType, PostVisibility
from app.schemas.report import (
    AdminPostModerate,
    AdminStatsOut,
    AdminUserUpdate,
    ReportOut,
    ReportStatus,
    ReportUpdate,
)
from app.schemas.user import UserOut
from app.services.admin import (
    get_admin_reports,
    get_stats,
    list_posts,
    list_users,
    moderate_post,
    serialize_admin_post,
    serialize_admin_user,
    set_report_status,
    update_user_admin,
)
from app.services.event_reminders import list_event_reminders
from app.services.lives import get_live_by_id, list_admin_lives, to_live_out, update_live_admin
from app.services.system import (
    collect_metrics_snapshot,
    get_system_overview,
    list_backups,
    list_logs,
    list_metrics,
    run_all_backups,
)


router = APIRouter()


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(_: dict = Depends(require_admin_user)) -> AdminStatsOut:
    return AdminStatsOut(**await get_stats())


@router.get("/users")
async def admin_users(
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = None,
    _: dict = Depends(require_admin_user),
) -> dict:
    users = await list_users(search=search, limit=limit)
    return {"items": [serialize_admin_user(user) for user in users], "next_cursor": None}


@router.patch("/users/{user_id}", response_model=UserOut)
async def admin_update_user(
    user_id: str,
    payload: AdminUserUpdate,
    current_admin: dict = Depends(require_admin_user),
) -> UserOut:
    try:
        user = await update_user_admin(
            user_id,
            payload.model_dump(exclude_unset=True),
            current_admin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserOut(
        **serialize_admin_user(user),
        bio=user.get("bio", ""),
        country=user.get("country", ""),
        avatar_url=user.get("avatar_url"),
        updated_at=user["updated_at"],
    )


@router.get("/posts")
async def admin_posts(
    type: PostType | None = None,
    visibility: PostVisibility | None = None,
    hidden: bool | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = None,
    _: dict = Depends(require_admin_user),
) -> dict:
    posts = await list_posts(
        post_type=type,
        visibility=visibility,
        hidden=hidden,
        limit=limit,
    )
    return {"items": [serialize_admin_post(post) for post in posts], "next_cursor": None}


@router.patch("/posts/{post_id}/moderate", response_model=PostOut)
async def admin_moderate_post(
    post_id: str,
    payload: AdminPostModerate,
    _: dict = Depends(require_admin_user),
) -> PostOut:
    post = await moderate_post(post_id, payload.is_hidden, payload.reason)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return PostOut(**serialize_admin_post(post))


@router.get("/reports")
async def admin_reports(
    status: ReportStatus | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    _: dict = Depends(require_admin_user),
) -> dict:
    return {"items": await get_admin_reports(status, limit), "next_cursor": None}


@router.get("/event-reminders", response_model=EventRemindersResponse)
async def admin_event_reminders(
    status: ReminderStatus | None = None,
    event_id: str | None = None,
    limit: int = Query(default=80, ge=1, le=100),
    _: dict = Depends(require_admin_user),
) -> EventRemindersResponse:
    return EventRemindersResponse(
        items=await list_event_reminders(status=status, event_id=event_id, limit=limit),
        next_cursor=None,
    )


@router.get("/lives")
async def admin_lives(
    status: LiveModerationStatus | None = None,
    active: bool | None = None,
    limit: int = Query(default=80, ge=1, le=100),
    _: dict = Depends(require_admin_user),
) -> dict:
    return {
        "items": await list_admin_lives(status_filter=status, active=active, limit=limit),
        "next_cursor": None,
    }


@router.patch("/lives/{live_id}", response_model=LiveOut)
async def admin_update_live(
    live_id: str,
    payload: LiveAdminUpdate,
    current_admin: dict = Depends(require_admin_user),
) -> LiveOut:
    live = await get_live_by_id(live_id)
    if live is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live not found.")
    updated = await update_live_admin(live, payload.model_dump(exclude_unset=True), current_admin)
    return to_live_out(updated)


@router.get("/system")
async def admin_system(_: dict = Depends(require_admin_user)) -> dict:
    return await get_system_overview()


@router.get("/system/backups")
async def admin_system_backups(
    limit: int = Query(default=20, ge=1, le=100),
    _: dict = Depends(require_admin_user),
) -> dict:
    return {"items": await list_backups(limit=limit), "next_cursor": None}


@router.post("/system/backups/run")
async def admin_run_system_backup(_: dict = Depends(require_admin_user)) -> dict:
    return {"items": await run_all_backups()}


@router.get("/system/logs")
async def admin_system_logs(
    level: str | None = None,
    source: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    _: dict = Depends(require_admin_user),
) -> dict:
    return {"items": await list_logs(level=level, source=source, limit=limit), "next_cursor": None}


@router.get("/system/metrics")
async def admin_system_metrics(
    limit: int = Query(default=60, ge=1, le=200),
    _: dict = Depends(require_admin_user),
) -> dict:
    return {"items": await list_metrics(limit=limit), "next_cursor": None}


@router.post("/system/metrics/snapshot")
async def admin_system_metrics_snapshot(_: dict = Depends(require_admin_user)) -> dict:
    return await collect_metrics_snapshot()


@router.patch("/reports/{report_id}", response_model=ReportOut)
async def admin_update_report(
    report_id: str,
    payload: ReportUpdate,
    _: dict = Depends(require_admin_user),
) -> ReportOut:
    report = await set_report_status(report_id, payload.status)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return report
