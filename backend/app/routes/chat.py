from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_active_user
from app.schemas.chat import (
    ConversationCreate,
    ConversationOut,
    ConversationsResponse,
    MessageCreate,
    MessageOut,
    MessagesResponse,
)
from app.services.chat import (
    create_message,
    get_conversation_by_id,
    get_conversation_messages,
    get_message_by_id,
    get_or_create_conversation,
    get_user_conversations,
    soft_delete_message,
    to_conversation_out,
    to_message_out,
    user_in_conversation,
)
from app.services.users import get_user_by_id


router = APIRouter()


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(
    payload: ConversationCreate,
    current_user: dict = Depends(require_active_user),
) -> ConversationOut:
    current_user_id = str(current_user["_id"])

    if payload.user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot create a conversation with yourself.",
        )

    other_user = await get_user_by_id(payload.user_id)
    if other_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    conversation = await get_or_create_conversation(current_user, other_user)
    return to_conversation_out(conversation, current_user_id)


@router.get("/conversations", response_model=ConversationsResponse)
async def get_conversations_endpoint(
    current_user: dict = Depends(require_active_user),
) -> ConversationsResponse:
    conversations = await get_user_conversations(current_user)
    current_user_id = str(current_user["_id"])
    return ConversationsResponse(
        items=[
            to_conversation_out(conversation, current_user_id)
            for conversation in conversations
        ]
    )


@router.get("/conversations/{conversation_id}/messages", response_model=MessagesResponse)
async def get_messages_endpoint(
    conversation_id: str,
    limit: int = Query(default=24, ge=1, le=40),
    cursor: str | None = None,
    current_user: dict = Depends(require_active_user),
) -> MessagesResponse:
    conversation = await get_conversation_by_id(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if not user_in_conversation(conversation, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    messages, next_cursor = await get_conversation_messages(
        conversation,
        current_user,
        limit,
        cursor,
    )
    return MessagesResponse(
        items=[to_message_out(message) for message in messages],
        next_cursor=next_cursor,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def create_message_endpoint(
    conversation_id: str,
    payload: MessageCreate,
    current_user: dict = Depends(require_active_user),
) -> MessageOut:
    conversation = await get_conversation_by_id(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if not user_in_conversation(conversation, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    message = await create_message(conversation, current_user, payload.text)
    return to_message_out(message)


@router.delete("/messages/{message_id}")
async def delete_message_endpoint(
    message_id: str,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    message = await get_message_by_id(message_id)
    if message is None or message.get("is_deleted"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    if message.get("sender_id") != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")

    await soft_delete_message(message)
    return {"message": "Message deleted"}
