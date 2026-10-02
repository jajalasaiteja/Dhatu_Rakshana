"""Authentication router for certified naval inspectors and platform administrators."""

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserRead
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    """Registers a new certified user/inspector."""
    auth_service = AuthService(session)
    return auth_service.register(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        username=data.username,
        role=data.role
    )

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)):
    """Authenticates inspector/admin credentials with username or email and issues signed JWT."""
    auth_service = AuthService(session)
    return auth_service.login(
        identifier=data.username or data.email,
        password=data.password,
        email=data.email,
        username=data.username
    )

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile of currently authenticated user."""
    return UserRead(
        id=current_user.id,
        username=current_user.username or current_user.email.split("@")[0],
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logs out currently authenticated user."""
    return {
        "status": "success",
        "message": f"User {current_user.email} successfully logged out."
    }
