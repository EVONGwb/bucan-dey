from datetime import datetime, timezone
from typing import Literal


UserRole = Literal["user", "admin"]


def build_user_document(
    *,
    username: str,
    display_name: str,
    email: str,
    password_hash: str,
    city: str | None = None,
    country: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc)

    return {
        "username": username,
        "display_name": display_name,
        "email": email,
        "password_hash": password_hash,
        "avatar_url": None,
        "bio": "",
        "city": city or "",
        "country": country or "",
        "role": "user",
        "is_verified": False,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
