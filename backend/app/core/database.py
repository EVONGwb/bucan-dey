from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import HTTPException, status

from app.core.config import settings


mongo_client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global mongo_client, database

    if not settings.MONGO_URL:
        mongo_client = None
        database = None
        return

    mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    database = mongo_client[settings.DB_NAME]
    await create_indexes()


async def close_mongo_connection() -> None:
    global mongo_client, database

    if mongo_client is not None:
        mongo_client.close()

    mongo_client = None
    database = None


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is not connected. Check MONGO_URL configuration.",
        )

    return database


async def create_indexes() -> None:
    if database is None:
        return

    await database.users.create_index("email", unique=True)
    await database.users.create_index("username", unique=True)
    await database.users.create_index("google_id", unique=True, sparse=True)
    await database.users.create_index([("followers_count", -1), ("created_at", -1)])
    await database.posts.create_index([("created_at", -1), ("_id", -1)])
    await database.posts.create_index([("visibility", 1), ("created_at", -1)])
    await database.posts.create_index(
        [("visibility", 1), ("is_deleted", 1), ("is_hidden", 1), ("created_at", -1), ("_id", -1)]
    )
    await database.posts.create_index(
        [("author_id", 1), ("visibility", 1), ("is_deleted", 1), ("is_hidden", 1), ("created_at", -1)]
    )
    await database.posts.create_index([("author_id", 1), ("created_at", -1)])
    await database.posts.create_index([("type", 1), ("created_at", -1)])
    await database.posts.create_index(
        [
            ("location.show_on_map", 1),
            ("visibility", 1),
            ("is_deleted", 1),
            ("is_hidden", 1),
            ("created_at", -1),
        ]
    )
    await database.posts.create_index([("location.geo", "2dsphere")], sparse=True)
    await database.stories.create_index([("author_id", 1), ("created_at", -1)])
    await database.stories.create_index([("visibility", 1), ("created_at", -1)])
    await database.stories.create_index([("location.geo", "2dsphere")], sparse=True)
    await database.stories.create_index([("expires_at", 1)], expireAfterSeconds=0)
    await database.events.create_index([("start_at", 1), ("is_cancelled", 1)])
    await database.events.create_index([("visibility", 1), ("start_at", 1)])
    await database.events.create_index([("category", 1), ("start_at", 1)])
    await database.events.create_index([("location.city", 1), ("start_at", 1)])
    await database.events.create_index([("location.geo", "2dsphere")], sparse=True)
    await database.lives.create_index([("is_live", 1), ("started_at", -1)])
    await database.lives.create_index([("visibility", 1), ("is_live", 1), ("started_at", -1)])
    await database.lives.create_index([("category", 1), ("is_live", 1), ("started_at", -1)])
    await database.lives.create_index([("moderation_status", 1), ("is_live", 1), ("started_at", -1)])
    await database.lives.create_index([("last_heartbeat_at", 1), ("is_live", 1)])
    await database.lives.create_index([("location.city", 1), ("is_live", 1)])
    await database.lives.create_index([("location.geo", "2dsphere")], sparse=True)
    await database.live_viewers.create_index([("live_id", 1), ("user_id", 1)], unique=True)
    await database.live_viewers.create_index([("live_id", 1), ("last_seen_at", -1)])
    await database.live_viewers.create_index([("live_id", 1), ("active", 1), ("last_seen_at", -1)])
    await database.live_reports.create_index([("live_id", 1), ("reporter_id", 1)], unique=True)
    await database.live_reports.create_index([("status", 1), ("created_at", -1)])
    await database.event_attendees.create_index([("event_id", 1), ("user_id", 1)], unique=True)
    await database.event_attendees.create_index([("user_id", 1), ("created_at", -1)])
    await database.event_reminders.create_index(
        [("event_id", 1), ("user_id", 1), ("reminder_type", 1)],
        unique=True,
    )
    await database.event_reminders.create_index([("status", 1), ("scheduled_for", 1)])
    await database.event_reminders.create_index([("event_id", 1), ("status", 1)])
    await database.event_reminders.create_index([("user_id", 1), ("status", 1)])
    await database.likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
    await database.reposts.create_index([("user_id", 1), ("post_id", 1)], unique=True)
    await database.reposts.create_index([("post_id", 1), ("created_at", -1)])
    await database.reposts.create_index([("user_id", 1), ("created_at", -1)])
    await database.follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
    await database.follows.create_index([("following_id", 1), ("created_at", -1)])
    await database.follows.create_index([("follower_id", 1), ("created_at", -1)])
    await database.comments.create_index([("post_id", 1), ("created_at", -1)])
    await database.comments.create_index([("author_id", 1), ("created_at", -1)])
    await database.chat_conversations.create_index("participant_ids")
    await database.chat_conversations.create_index("conversation_key", unique=True)
    await database.chat_conversations.create_index([("last_message_at", -1)])
    await database.chat_messages.create_index([("conversation_id", 1), ("created_at", -1)])
    await database.chat_messages.create_index([("sender_id", 1), ("created_at", -1)])
    await database.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await database.notifications.create_index([("user_id", 1), ("is_read", 1)])
    await database.notifications.create_index([("entity_type", 1), ("entity_id", 1)])
    await database.push_subscriptions.create_index([("user_id", 1)])
    await database.push_subscriptions.create_index([("endpoint", 1)], unique=True)
    await database.reports.create_index([("status", 1), ("created_at", -1)])
    await database.reports.create_index([("target_type", 1), ("target_id", 1)])
    await database.reports.create_index(
        [("reporter_id", 1), ("target_type", 1), ("target_id", 1)],
        unique=True,
    )
    await database.system_backups.create_index([("started_at", -1)])
    await database.system_backups.create_index([("type", 1), ("started_at", -1)])
    await database.system_backups.create_index([("status", 1), ("started_at", -1)])
    await database.system_logs.create_index([("created_at", -1)])
    await database.system_logs.create_index([("level", 1), ("created_at", -1)])
    await database.system_logs.create_index([("source", 1), ("created_at", -1)])
    await database.system_metrics.create_index([("created_at", -1)])
