from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.realtime import realtime_manager
from app.core.security import get_user_from_token
from app.services.chat import get_conversation_by_id, get_user_contact_ids, user_in_conversation
from app.services.lives import can_view_live, get_live_by_id, send_live_comment
from app.services.notifications import emit_unread_count


router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None) -> None:
    await handle_websocket(websocket, token)


@router.websocket("/ws/{token}")
async def websocket_endpoint_with_path_token(websocket: WebSocket, token: str) -> None:
    await handle_websocket(websocket, token)


async def handle_websocket(websocket: WebSocket, token: str | None = None) -> None:
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await get_user_from_token(token)
    if user is None or not user.get("is_active", True):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = str(user["_id"])
    contacts = await get_user_contact_ids(user_id)
    was_offline = await realtime_manager.connect(user_id, websocket)

    await websocket.send_json(
        {
            "type": "connection_ready",
            "payload": {
                "user_id": user_id,
                "online_user_ids": [
                    contact_id
                    for contact_id in contacts
                    if realtime_manager.is_online(contact_id)
                ],
            },
        }
    )
    await emit_unread_count(user_id)

    if was_offline:
        await realtime_manager.send_to_users(
            contacts,
            "user_online",
            {"user_id": user_id},
            exclude_user_id=user_id,
        )

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")
            payload = data.get("payload") or {}

            if event_type in {"typing_start", "typing_stop"}:
                await broadcast_typing_event(event_type, payload, user)
            if event_type == "live_comment":
                await broadcast_live_comment(payload, user)
    except WebSocketDisconnect:
        is_now_offline = realtime_manager.disconnect(user_id, websocket)
        if is_now_offline:
            await realtime_manager.send_to_users(
                contacts,
                "user_offline",
                {"user_id": user_id},
                exclude_user_id=user_id,
            )


async def broadcast_typing_event(event_type: str, payload: dict, user: dict) -> None:
    conversation_id = payload.get("conversation_id")
    if not isinstance(conversation_id, str):
        return

    conversation = await get_conversation_by_id(conversation_id)
    if conversation is None or not user_in_conversation(conversation, user):
        return

    user_id = str(user["_id"])
    await realtime_manager.send_to_users(
        conversation.get("participant_ids", []),
        event_type,
        {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "display_name": user.get("display_name", ""),
        },
        exclude_user_id=user_id,
    )


async def broadcast_live_comment(payload: dict, user: dict) -> None:
    live_id = payload.get("live_id")
    text = (payload.get("text") or "").strip()
    if not isinstance(live_id, str) or not text:
        return

    live = await get_live_by_id(live_id)
    if live is None or not await can_view_live(live, user):
        return

    await send_live_comment(live, user, text[:300])
