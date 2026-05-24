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
    await database.posts.create_index([("created_at", -1), ("_id", -1)])
    await database.posts.create_index([("visibility", 1), ("created_at", -1)])
    await database.posts.create_index([("author_id", 1), ("created_at", -1)])
    await database.posts.create_index([("type", 1), ("created_at", -1)])
    await database.likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
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
    await database.reports.create_index([("status", 1), ("created_at", -1)])
    await database.reports.create_index([("target_type", 1), ("target_id", 1)])
    await database.reports.create_index(
        [("reporter_id", 1), ("target_type", 1), ("target_id", 1)],
        unique=True,
    )
