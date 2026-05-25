from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.routes import admin, auth, chat, comments, feed, health, map, media, notifications, posts, reports, trending, users, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
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

app.include_router(health.router, prefix=settings.API_PREFIX, tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(feed.router, prefix=f"{settings.API_PREFIX}/feed", tags=["feed"])
app.include_router(media.router, prefix=f"{settings.API_PREFIX}/media", tags=["media"])
app.include_router(map.router, prefix=f"{settings.API_PREFIX}/map", tags=["map"])
app.include_router(trending.router, prefix=f"{settings.API_PREFIX}/trending", tags=["trending"])
app.include_router(users.router, prefix=f"{settings.API_PREFIX}/users", tags=["users"])
app.include_router(posts.router, prefix=f"{settings.API_PREFIX}/posts", tags=["posts"])
app.include_router(comments.router, prefix=f"{settings.API_PREFIX}/comments", tags=["comments"])
app.include_router(chat.router, prefix=f"{settings.API_PREFIX}/chat", tags=["chat"])
app.include_router(notifications.router, prefix=f"{settings.API_PREFIX}/notifications", tags=["notifications"])
app.include_router(reports.router, prefix=f"{settings.API_PREFIX}/reports", tags=["reports"])
app.include_router(admin.router, prefix=f"{settings.API_PREFIX}/admin", tags=["admin"])
app.include_router(ws.router, prefix=settings.API_PREFIX, tags=["websocket"])
