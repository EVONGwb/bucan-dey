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
    avatar_url: str | None = None,
    google_id: str | None = None,
    auth_provider: str = "local",
    providers: list[str] | None = None,
    is_verified: bool = False,
    onboarding_completed: bool = False,
) -> dict:
    now = datetime.now(timezone.utc)

    document = {
        "username": username,
        "display_name": display_name,
        "email": email,
        "password_hash": password_hash,
        "avatar_url": avatar_url,
        "bio": "",
        "city": city or "",
        "country": country or "",
        "auth_provider": auth_provider,
        "providers": providers or [auth_provider],
        "onboarding_completed": onboarding_completed,
        "onboarding_completed_at": now if onboarding_completed else None,
        "role": "user",
        "is_verified": is_verified,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    if google_id:
        document["google_id"] = google_id

    return document
