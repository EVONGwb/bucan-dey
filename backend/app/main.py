from contextlib import asynccontextmanager
import time

from fastapi import Request
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.routes import admin, auth, chat, comments, events, feed, health, lives, map, media, notifications, posts, push, reports, stories, trending, users, ws
from app.services.event_reminders import start_event_reminder_scheduler, stop_event_reminder_scheduler
from app.services.lives import start_live_control_scheduler, stop_live_control_scheduler
from app.services.system import log_system_event, set_latest_response_ms, start_system_scheduler, stop_system_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    if settings.MONGO_URL:
        start_event_reminder_scheduler()
        start_live_control_scheduler()
        start_system_scheduler()
    yield
    await stop_system_scheduler()
    await stop_live_control_scheduler()
    await stop_event_reminder_scheduler()
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def production_monitoring_middleware(request: Request, call_next):
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
        set_latest_response_ms(int((time.perf_counter() - started_at) * 1000))
        return response
    except Exception as exc:
        set_latest_response_ms(int((time.perf_counter() - started_at) * 1000))
        await log_system_event(
            level="critical",
            source="backend",
            message=f"Unhandled error on {request.method} {request.url.path}",
            details={"error": str(exc), "path": request.url.path, "method": request.method},
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.include_router(health.router, prefix=settings.API_PREFIX, tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(feed.router, prefix=f"{settings.API_PREFIX}/feed", tags=["feed"])
app.include_router(media.router, prefix=f"{settings.API_PREFIX}/media", tags=["media"])
app.include_router(map.router, prefix=f"{settings.API_PREFIX}/map", tags=["map"])
app.include_router(trending.router, prefix=f"{settings.API_PREFIX}/trending", tags=["trending"])
app.include_router(stories.router, prefix=f"{settings.API_PREFIX}/stories", tags=["stories"])
app.include_router(events.router, prefix=f"{settings.API_PREFIX}/events", tags=["events"])
app.include_router(lives.router, prefix=f"{settings.API_PREFIX}/lives", tags=["lives"])
app.include_router(users.router, prefix=f"{settings.API_PREFIX}/users", tags=["users"])
app.include_router(posts.router, prefix=f"{settings.API_PREFIX}/posts", tags=["posts"])
app.include_router(comments.router, prefix=f"{settings.API_PREFIX}/comments", tags=["comments"])
app.include_router(chat.router, prefix=f"{settings.API_PREFIX}/chat", tags=["chat"])
app.include_router(notifications.router, prefix=f"{settings.API_PREFIX}/notifications", tags=["notifications"])
app.include_router(push.router, prefix=f"{settings.API_PREFIX}/push", tags=["push"])
app.include_router(reports.router, prefix=f"{settings.API_PREFIX}/reports", tags=["reports"])
app.include_router(admin.router, prefix=f"{settings.API_PREFIX}/admin", tags=["admin"])
app.include_router(ws.router, prefix=settings.API_PREFIX, tags=["websocket"])
