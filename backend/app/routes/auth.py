from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import create_access_token, require_active_user
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserOut
from app.services.users import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_username,
    serialize_user,
)


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate) -> TokenResponse:
    if await get_user_by_email(str(payload.email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    if await get_user_by_username(payload.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered.",
        )

    try:
        user = await create_user(payload)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username is already registered.",
        ) from None

    user_out = UserOut(**serialize_user(user))
    token = create_access_token(subject=user_out.id)
    return TokenResponse(access_token=token, user=user_out)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin) -> TokenResponse:
    user = await authenticate_user(payload.identifier, payload.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user.",
        )

    user_out = UserOut(**serialize_user(user))
    token = create_access_token(subject=user_out.id)
    return TokenResponse(access_token=token, user=user_out)


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(require_active_user)) -> UserOut:
    return UserOut(**serialize_user(current_user))


@router.post("/logout")
async def logout() -> dict[str, str]:
    return {"message": "Logged out"}
