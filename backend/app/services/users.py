import re
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.security import hash_password, verify_password
from app.models.user import build_user_document
from app.schemas.user import UserCreate


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "display_name": user["display_name"],
        "email": user["email"],
        "avatar_url": user.get("avatar_url"),
        "bio": user.get("bio", ""),
        "city": user.get("city", ""),
        "country": user.get("country", ""),
        "role": user.get("role", "user"),
        "google_id": user.get("google_id"),
        "auth_provider": user.get("auth_provider", "local"),
        "providers": user.get("providers", [user.get("auth_provider", "local")]),
        "is_verified": user.get("is_verified", False),
        "is_active": user.get("is_active", True),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }


async def get_user_by_id(user_id: str) -> dict | None:
    if not ObjectId.is_valid(user_id):
        return None

    db = get_database()
    return await db.users.find_one({"_id": ObjectId(user_id)})


async def get_user_by_email(email: str) -> dict | None:
    db = get_database()
    return await db.users.find_one({"email": email.lower()})


async def get_user_by_username(username: str) -> dict | None:
    db = get_database()
    return await db.users.find_one({"username": username.lower()})


async def get_user_by_google_id(google_id: str) -> dict | None:
    db = get_database()
    return await db.users.find_one({"google_id": google_id})


async def get_user_by_identifier(identifier: str) -> dict | None:
    db = get_database()
    normalized = identifier.lower()
    return await db.users.find_one(
        {"$or": [{"email": normalized}, {"username": normalized}]}
    )


async def create_user(user_create: UserCreate) -> dict:
    db = get_database()

    user_doc = build_user_document(
        username=user_create.username,
        display_name=user_create.display_name,
        email=str(user_create.email),
        password_hash=hash_password(user_create.password),
        city=user_create.city,
        country=user_create.country,
    )

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise ValueError("User already exists.") from None

    created_user = await db.users.find_one({"_id": result.inserted_id})
    if created_user is None:
        raise RuntimeError("User was created but could not be loaded.")

    return created_user


async def authenticate_user(identifier: str, password: str) -> dict | None:
    user = await get_user_by_identifier(identifier)

    if user is None:
        return None

    password_hash = user.get("password_hash")
    if not password_hash or not verify_password(password, password_hash):
        return None

    return user


def normalize_google_username(email: str) -> str:
    raw = email.split("@", 1)[0].lower()
    username = re.sub(r"[^a-z0-9._]", "", raw)
    username = username.strip("._") or "bucan"
    return username[:28]


async def generate_unique_username(email: str) -> str:
    db = get_database()
    base = normalize_google_username(email)
    username = base
    suffix = 1

    while await db.users.find_one({"username": username}):
        suffix_text = str(suffix)
        username = f"{base[: max(3, 32 - len(suffix_text))]}{suffix_text}"
        suffix += 1

    return username


async def upsert_google_user(profile: dict) -> dict:
    db = get_database()
    email = profile["email"].lower()
    google_id = profile["sub"]
    now = datetime.now(timezone.utc)

    existing = await get_user_by_email(email)
    if existing:
        update: dict = {
            "updated_at": now,
            "google_id": existing.get("google_id") or google_id,
        }
        providers = existing.get("providers") or [existing.get("auth_provider", "local")]
        if "google" not in providers:
            providers.append("google")
        update["providers"] = providers
        if not existing.get("avatar_url") and profile.get("picture"):
            update["avatar_url"] = profile["picture"]
        if profile.get("email_verified"):
            update["is_verified"] = True

        await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
        return await db.users.find_one({"_id": existing["_id"]})

    username = await generate_unique_username(email)
    user_doc = build_user_document(
        username=username,
        display_name=profile.get("name") or username,
        email=email,
        password_hash="",
        avatar_url=profile.get("picture"),
        google_id=google_id,
        auth_provider="google",
        providers=["google"],
        is_verified=bool(profile.get("email_verified")),
    )

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        existing = await get_user_by_email(email)
        if existing:
            return await upsert_google_user(profile)
        raise ValueError("User already exists.") from None

    created_user = await db.users.find_one({"_id": result.inserted_id})
    if created_user is None:
        raise RuntimeError("User was created but could not be loaded.")

    return created_user
