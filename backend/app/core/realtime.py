from collections import defaultdict
from typing import Any

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder


class RealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, websocket: WebSocket) -> bool:
        was_offline = not self.is_online(user_id)
        await websocket.accept()
        self._connections[user_id].add(websocket)
        return was_offline

    def disconnect(self, user_id: str, websocket: WebSocket) -> bool:
        connections = self._connections.get(user_id)
        if not connections:
            return False

        connections.discard(websocket)
        if connections:
            return False

        self._connections.pop(user_id, None)
        return True

    def is_online(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))

    @property
    def online_users_count(self) -> int:
        return len(self._connections)

    @property
    def connections_count(self) -> int:
        return sum(len(connections) for connections in self._connections.values())

    async def send_to_user(self, user_id: str, event_type: str, payload: dict[str, Any]) -> None:
        connections = list(self._connections.get(user_id, set()))
        stale_connections: list[WebSocket] = []

        for websocket in connections:
            try:
                await websocket.send_json(
                    jsonable_encoder({"type": event_type, "payload": payload})
                )
            except RuntimeError:
                stale_connections.append(websocket)

        if stale_connections:
            active = self._connections.get(user_id)
            if active is not None:
                for websocket in stale_connections:
                    active.discard(websocket)
                if not active:
                    self._connections.pop(user_id, None)

    async def send_to_users(
        self,
        user_ids: list[str],
        event_type: str,
        payload: dict[str, Any],
        exclude_user_id: str | None = None,
    ) -> None:
        for user_id in set(user_ids):
            if user_id == exclude_user_id:
                continue
            await self.send_to_user(user_id, event_type, payload)


realtime_manager = RealtimeManager()
