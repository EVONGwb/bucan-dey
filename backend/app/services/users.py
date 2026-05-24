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

    if not verify_password(password, user["password_hash"]):
        return None

    return user
