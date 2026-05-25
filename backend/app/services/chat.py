import base64
import json
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.models.chat import build_conversation_document, build_message_document
from app.schemas.chat import ConversationOut, MessageOut


def serialize_conversation(conversation: dict, current_user_id: str) -> dict:
    other_user = next(
        snapshot
        for snapshot in conversation["participant_snapshots"]
        if snapshot["user_id"] != current_user_id
    )

    return {
        "id": str(conversation["_id"]),
        "participant_ids": conversation["participant_ids"],
        "participant_snapshots": conversation["participant_snapshots"],
        "other_user": other_user,
        "last_message": conversation.get("last_message"),
        "last_message_at": conversation["last_message_at"],
        "created_at": conversation["created_at"],
        "updated_at": conversation["updated_at"],
    }


def serialize_message(message: dict) -> dict:
    return {
        "id": str(message["_id"]),
        "conversation_id": message["conversation_id"],
        "sender_id": message["sender_id"],
        "sender_snapshot": message["sender_snapshot"],
        "text": message["text"],
        "media_url": message.get("media_url"),
        "read_by": message.get("read_by", []),
        "is_deleted": message.get("is_deleted", False),
        "created_at": message["created_at"],
    }


def to_conversation_out(conversation: dict, current_user_id: str) -> ConversationOut:
    return ConversationOut(**serialize_conversation(conversation, current_user_id))


def to_message_out(message: dict) -> MessageOut:
    return MessageOut(**serialize_message(message))


def encode_cursor(message: dict) -> str:
    raw = {"created_at": message["created_at"].isoformat(), "id": str(message["_id"])}
    return base64.urlsafe_b64encode(json.dumps(raw).encode()).decode()


def decode_cursor(cursor: str | None) -> tuple[datetime, ObjectId] | None:
    if not cursor:
        return None

    try:
        raw = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        created_at = datetime.fromisoformat(raw["created_at"])
        if created_at.tzinfo is not None:
            created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
        return created_at, ObjectId(raw["id"])
    except (ValueError, KeyError, TypeError):
        return None


async def get_or_create_conversation(current_user: dict, other_user: dict) -> dict:
    db = get_database()
    participant_ids = sorted([str(current_user["_id"]), str(other_user["_id"])])
    conversation_key = ":".join(participant_ids)
    existing = await db.chat_conversations.find_one({"conversation_key": conversation_key})
    if existing:
        return existing

    document = build_conversation_document(current_user, other_user)
    try:
        result = await db.chat_conversations.insert_one(document)
    except DuplicateKeyError:
        existing = await db.chat_conversations.find_one({"conversation_key": conversation_key})
        if existing:
            return existing
        raise

    created = await db.chat_conversations.find_one({"_id": result.inserted_id})
    if created is None:
        raise RuntimeError("Conversation was created but could not be loaded.")
    await _notify_conversation_created(current_user, other_user, created)
    return created


async def get_conversation_by_id(conversation_id: str) -> dict | None:
    if not ObjectId.is_valid(conversation_id):
        return None

    db = get_database()
    return await db.chat_conversations.find_one({"_id": ObjectId(conversation_id)})


def user_in_conversation(conversation: dict, user: dict) -> bool:
    return str(user["_id"]) in conversation.get("participant_ids", [])


async def get_user_conversations(user: dict) -> list[dict]:
    db = get_database()
    user_id = str(user["_id"])
    return await (
        db.chat_conversations.find({"participant_ids": user_id})
        .sort([("last_message_at", -1), ("_id", -1)])
        .to_list(100)
    )


async def get_conversation_messages(
    conversation: dict,
    user: dict,
    limit: int,
    cursor: str | None = None,
) -> tuple[list[dict], str | None]:
    db = get_database()
    conversation_id = str(conversation["_id"])
    query = {"conversation_id": conversation_id, "is_deleted": False}
    cursor_data = decode_cursor(cursor)

    if cursor_data:
        cursor_created_at, cursor_id = cursor_data
        query["$or"] = [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "_id": {"$lt": cursor_id}},
        ]

    fetch_limit = min(max(limit, 1), 50)
    messages = await (
        db.chat_messages.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .limit(fetch_limit + 1)
        .to_list(fetch_limit + 1)
    )

    next_cursor = None
    if len(messages) > fetch_limit:
        next_cursor = encode_cursor(messages[fetch_limit - 1])
        messages = messages[:fetch_limit]

    await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "is_deleted": False},
        {"$addToSet": {"read_by": str(user["_id"])}},
    )

    return list(reversed(messages)), next_cursor


async def create_message(conversation: dict, sender: dict, text: str) -> dict:
    db = get_database()
    conversation_id = str(conversation["_id"])
    message_doc = build_message_document(conversation_id, sender, text)
    result = await db.chat_messages.insert_one(message_doc)
    created = await db.chat_messages.find_one({"_id": result.inserted_id})
    if created is None:
        raise RuntimeError("Message was created but could not be loaded.")

    await db.chat_conversations.update_one(
        {"_id": conversation["_id"]},
        {
            "$set": {
                "last_message": {
                    "text": text,
                    "sender_id": str(sender["_id"]),
                    "created_at": created["created_at"],
                },
                "last_message_at": created["created_at"],
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    await _notify_message_sent(conversation, sender, created)
    await _emit_chat_message(conversation, sender, created)

    return created


async def _emit_chat_message(conversation: dict, sender: dict, message: dict) -> None:
    from app.core.realtime import realtime_manager

    actor_id = str(sender["_id"])
    payload = {
        "conversation_id": str(conversation["_id"]),
        "message": serialize_message(message),
        "sender_id": actor_id,
    }
    recipients = [
        user_id for user_id in conversation.get("participant_ids", []) if user_id != actor_id
    ]
    await realtime_manager.send_to_users(recipients, "chat_message", payload)


async def _notify_conversation_created(actor: dict, recipient: dict, conversation: dict) -> None:
    from app.services.notifications import create_notification

    await create_notification(
        user_id=str(recipient["_id"]),
        actor=actor,
        type="conversation",
        title="Nueva conversación",
        body=f"{actor['display_name']} abrió un chat contigo",
        entity_type="conversation",
        entity_id=str(conversation["_id"]),
        dedupe=True,
    )


async def _notify_message_sent(conversation: dict, actor: dict, message: dict) -> None:
    from app.services.notifications import create_notification

    actor_id = str(actor["_id"])
    recipients = [
        user_id for user_id in conversation.get("participant_ids", []) if user_id != actor_id
    ]
    for recipient_id in recipients:
        await create_notification(
            user_id=recipient_id,
            actor=actor,
            type="message",
            title="Nuevo mensaje",
            body=f"{actor['display_name']} te envió un mensaje",
            entity_type="message",
            entity_id=str(message["_id"]),
        )


async def get_message_by_id(message_id: str) -> dict | None:
    if not ObjectId.is_valid(message_id):
        return None

    db = get_database()
    return await db.chat_messages.find_one({"_id": ObjectId(message_id)})


async def soft_delete_message(message: dict) -> None:
    db = get_database()
    await db.chat_messages.update_one(
        {"_id": message["_id"]},
        {"$set": {"is_deleted": True}},
    )


async def get_user_contact_ids(user_id: str) -> list[str]:
    db = get_database()
    conversations = await (
        db.chat_conversations.find({"participant_ids": user_id}, {"participant_ids": 1})
        .limit(500)
        .to_list(500)
    )
    contact_ids: set[str] = set()
    for conversation in conversations:
        contact_ids.update(
            participant_id
            for participant_id in conversation.get("participant_ids", [])
            if participant_id != user_id
        )
    return list(contact_ids)
