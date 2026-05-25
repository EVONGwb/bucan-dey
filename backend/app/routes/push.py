from fastapi import APIRouter, Depends, Request

from app.core.security import require_active_user
from app.schemas.push import (
    PushSubscriptionIn,
    PushSubscriptionOut,
    PushUnsubscribeIn,
    PushTestResponse,
    VapidPublicKeyResponse,
)
from app.services.push import (
    get_vapid_public_key,
    send_test_push,
    unsubscribe_subscription,
    upsert_subscription,
)


router = APIRouter()


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
async def vapid_public_key_endpoint() -> VapidPublicKeyResponse:
    return VapidPublicKeyResponse(public_key=get_vapid_public_key())


@router.post("/subscribe", response_model=PushSubscriptionOut)
async def subscribe_push_endpoint(
    payload: PushSubscriptionIn,
    request: Request,
    current_user: dict = Depends(require_active_user),
) -> PushSubscriptionOut:
    subscription = await upsert_subscription(
        user_id=str(current_user["_id"]),
        payload=payload,
        user_agent=request.headers.get("user-agent"),
    )
    return PushSubscriptionOut(
        endpoint=subscription["endpoint"],
        is_active=subscription["is_active"],
        created_at=subscription["created_at"],
        updated_at=subscription["updated_at"],
    )


@router.delete("/unsubscribe")
async def unsubscribe_push_endpoint(
    payload: PushUnsubscribeIn,
    current_user: dict = Depends(require_active_user),
) -> dict[str, str]:
    await unsubscribe_subscription(str(current_user["_id"]), payload.endpoint)
    return {"message": "Push subscription disabled"}


@router.post("/test", response_model=PushTestResponse)
async def test_push_endpoint(
    current_user: dict = Depends(require_active_user),
) -> PushTestResponse:
    return PushTestResponse(sent=await send_test_push(str(current_user["_id"])))
