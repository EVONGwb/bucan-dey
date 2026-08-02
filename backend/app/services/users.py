import re
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.security import hash_password, verify_password
from app.models.user import build_user_document
from app.schemas.user import UserCreate, UserOnboardingUpdate


def has_complete_profile(user: dict) -> bool:
    return all(
        str(user.get(field, "")).strip()
        for field in ("username", "display_name", "city", "country")
    )


def serialize_user(user: dict, is_following: bool = False) -> dict:
    onboarding_completed = user.get("onboarding_completed")
    if onboarding_completed is None:
        onboarding_completed = has_complete_profile(user)

    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "display_name": user["display_name"],
        "email": user["email"],
        "avatar_url": user.get("avatar_url"),
        "bio": user.get("bio", ""),
        "city": user.get("city", ""),
        "country": user.get("country", ""),
        "profile_type": user.get("profile_type", "person"),
        "social_links": user.get("social_links", {}),
        "role": user.get("role", "user"),
        "google_id": user.get("google_id"),
        "auth_provider": user.get("auth_provider", "local"),
        "providers": user.get("providers", [user.get("auth_provider", "local")]),
        "onboarding_completed": bool(onboarding_completed),
        "onboarding_completed_at": user.get("onboarding_completed_at"),
        "followers_count": max(0, int(user.get("followers_count", 0))),
        "following_count": max(0, int(user.get("following_count", 0))),
        "is_following": is_following,
        "is_verified": user.get("is_verified", False),
        "is_active": user.get("is_active", True),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }


def _normalize_rank_city(value: str | None) -> str:
    return (value or "").strip().lower()


def _rank_label(score: float, followers_count: int, posts_count: int) -> tuple[str, int]:
    if score >= 900 or followers_count >= 500:
        return "Top Local", 8
    if score >= 420 or followers_count >= 150:
        return "Popular", 5
    if score >= 160 or posts_count >= 12:
        return "Creador", 3
    if score >= 45 or posts_count >= 3:
        return "Activo", 2
    return "Explorador", 1


def _rank_progress(score: float) -> int:
    thresholds = [0, 45, 160, 420, 900]
    if score >= thresholds[-1]:
        return 100

    current = thresholds[0]
    next_threshold = thresholds[-1]
    for index, threshold in enumerate(thresholds[:-1]):
        if threshold <= score < thresholds[index + 1]:
            current = threshold
            next_threshold = thresholds[index + 1]
            break

    progress = ((score - current) / max(1, next_threshold - current)) * 100
    return int(max(8, min(99, round(progress))))


def _ranking_score(metrics: dict) -> float:
    return round(
        metrics["followers_count"] * 12
        + metrics["posts_count"] * 8
        + metrics["likes_received"] * 4
        + metrics["comments_received"] * 3
        + metrics["reposts_received"] * 5
        + metrics["shares_received"] * 2
        + metrics["views_received"] * 0.1
        + metrics["following_count"],
        2,
    )


async def get_user_ranking(user: dict) -> dict:
    db = get_database()
    active_users = await db.users.find(
        {"is_active": True},
        {
            "username": 1,
            "display_name": 1,
            "city": 1,
            "country": 1,
            "followers_count": 1,
            "following_count": 1,
            "created_at": 1,
        },
    ).to_list(5000)

    post_metrics = await db.posts.aggregate(
        [
            {"$match": {"is_deleted": False, "is_hidden": False}},
            {
                "$group": {
                    "_id": "$author_id",
                    "posts_count": {"$sum": 1},
                    "likes_received": {"$sum": {"$ifNull": ["$stats.likes_count", 0]}},
                    "comments_received": {"$sum": {"$ifNull": ["$stats.comments_count", 0]}},
                    "reposts_received": {"$sum": {"$ifNull": ["$stats.reposts_count", 0]}},
                    "shares_received": {"$sum": {"$ifNull": ["$stats.shares_count", 0]}},
                    "views_received": {"$sum": {"$ifNull": ["$stats.views_count", 0]}},
                }
            },
        ]
    ).to_list(5000)
    post_metrics_by_author = {item["_id"]: item for item in post_metrics}

    ranked_users: list[dict] = []
    for item in active_users:
        user_id = str(item["_id"])
        user_post_metrics = post_metrics_by_author.get(user_id, {})
        metrics = {
            "followers_count": max(0, int(item.get("followers_count", 0))),
            "following_count": max(0, int(item.get("following_count", 0))),
            "posts_count": max(0, int(user_post_metrics.get("posts_count", 0))),
            "likes_received": max(0, int(user_post_metrics.get("likes_received", 0))),
            "comments_received": max(0, int(user_post_metrics.get("comments_received", 0))),
            "reposts_received": max(0, int(user_post_metrics.get("reposts_received", 0))),
            "shares_received": max(0, int(user_post_metrics.get("shares_received", 0))),
            "views_received": max(0, int(user_post_metrics.get("views_received", 0))),
        }
        score = _ranking_score(metrics)
        label, level = _rank_label(
            score,
            metrics["followers_count"],
            metrics["posts_count"],
        )
        ranked_users.append(
            {
                "id": user_id,
                "username": item["username"],
                "display_name": item["display_name"],
                "city": item.get("city", ""),
                "country": item.get("country", ""),
                "city_key": _normalize_rank_city(item.get("city")),
                "created_at": item.get("created_at") or datetime.now(timezone.utc),
                "score": score,
                "rank_label": label,
                "level": level,
                "progress": _rank_progress(score),
                "metrics": metrics,
            }
        )

    ranked_users.sort(
        key=lambda item: (
            -item["score"],
            -item["metrics"]["followers_count"],
            -item["metrics"]["posts_count"],
            item["created_at"],
        )
    )

    target_id = str(user["_id"])
    target_rank = next(
        (index + 1 for index, item in enumerate(ranked_users) if item["id"] == target_id),
        len(ranked_users) or 1,
    )
    target_item = next((item for item in ranked_users if item["id"] == target_id), None)

    if target_item is None:
        metrics = {
            "followers_count": max(0, int(user.get("followers_count", 0))),
            "following_count": max(0, int(user.get("following_count", 0))),
            "posts_count": 0,
            "likes_received": 0,
            "comments_received": 0,
            "reposts_received": 0,
            "shares_received": 0,
            "views_received": 0,
        }
        score = _ranking_score(metrics)
        label, level = _rank_label(score, metrics["followers_count"], 0)
        target_item = {
            "username": user["username"],
            "display_name": user["display_name"],
            "city": user.get("city", ""),
            "country": user.get("country", ""),
            "city_key": _normalize_rank_city(user.get("city")),
            "score": score,
            "rank_label": label,
            "level": level,
            "progress": _rank_progress(score),
            "metrics": metrics,
        }

    same_city = [
        item
        for item in ranked_users
        if target_item["city_key"] and item["city_key"] == target_item["city_key"]
    ]
    if not same_city:
        same_city = ranked_users

    city_rank = next(
        (index + 1 for index, item in enumerate(same_city) if item["id"] == target_id),
        target_rank,
    )

    return {
        "username": target_item["username"],
        "display_name": target_item["display_name"],
        "city": target_item["city"],
        "country": target_item["country"],
        "score": target_item["score"],
        "rank_label": target_item["rank_label"],
        "level": target_item["level"],
        "progress": target_item["progress"],
        "global_rank": target_rank,
        "global_total": len(ranked_users),
        "city_rank": city_rank,
        "city_total": len(same_city),
        "metrics": target_item["metrics"],
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
        onboarding_completed=bool(
            user_create.username
            and user_create.display_name
            and user_create.city
            and user_create.country
        ),
    )

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise ValueError("User already exists.") from None

    created_user = await db.users.find_one({"_id": result.inserted_id})
    if created_user is None:
        raise RuntimeError("User was created but could not be loaded.")

    return created_user


async def complete_user_onboarding(user: dict, payload: UserOnboardingUpdate) -> dict:
    db = get_database()
    existing_username = await get_user_by_username(payload.username)

    if existing_username and existing_username["_id"] != user["_id"]:
        raise ValueError("Username is already registered.")

    now = datetime.now(timezone.utc)
    update_data = {
        "username": payload.username,
        "display_name": payload.display_name,
        "city": payload.city,
        "country": payload.country,
        "bio": payload.bio,
        "avatar_url": payload.avatar_url,
        "profile_type": payload.profile_type,
        "social_links": payload.social_links,
        "onboarding_completed": True,
        "onboarding_completed_at": now,
        "updated_at": now,
    }

    try:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_data})
    except DuplicateKeyError:
        raise ValueError("Username is already registered.") from None

    updated_user = await db.users.find_one({"_id": user["_id"]})
    if updated_user is None:
        raise RuntimeError("User was updated but could not be loaded.")

    return updated_user


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
        if existing.get("onboarding_completed") is None:
            update["onboarding_completed"] = has_complete_profile(existing)
            update["onboarding_completed_at"] = now if update["onboarding_completed"] else None
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
