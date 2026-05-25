from google.auth.transport import requests
from google.oauth2 import id_token

from app.core.config import settings


def verify_google_id_token(token: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google login is not configured.")

    try:
        payload = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise ValueError("Invalid Google token.") from exc

    email = payload.get("email")
    subject = payload.get("sub")
    if not email or not subject:
        raise ValueError("Google token is missing required profile data.")

    return {
        "email": email.lower(),
        "name": payload.get("name") or email.split("@", 1)[0],
        "picture": payload.get("picture"),
        "sub": subject,
        "email_verified": bool(payload.get("email_verified")),
    }
