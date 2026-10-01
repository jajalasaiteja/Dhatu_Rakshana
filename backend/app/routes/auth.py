import hashlib
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
from typing import Optional

from db.db import get_session
from db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/register", status_code=201)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    clean_email = data.email.strip().lower()
    if not clean_email or not data.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    # Check if user already exists
    existing = session.exec(select(User).where(User.email == clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists. Please log in.")

    new_user = User(
        email=clean_email,
        password_hash=hash_pw(data.password),
        full_name=data.full_name.strip() or "Naval Inspector",
        role="inspector"
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email
    }

@router.post("/login")
def login(data: LoginRequest, session: Session = Depends(get_session)):
    clean_email = data.email.strip().lower()
    if not clean_email or not data.password:
        raise HTTPException(status_code=400, detail="Please enter both email and password.")

    # Strict look up in database
    user = session.exec(select(User).where(User.email == clean_email)).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Account does not exist. Please register an account first."
        )

    # Verify password hash
    if user.password_hash != hash_pw(data.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password. Please verify your credentials."
        )

    return {
        "access_token": f"dhatu-jwt-token-{user.id}-{user.email}",
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me")
def get_me(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")

    token = authorization.replace("Bearer ", "").strip()
    prefix = "dhatu-jwt-token-"
    if not token.startswith(prefix):
        raise HTTPException(status_code=401, detail="Invalid token signature.")

    payload = token[len(prefix):]
    if "-" not in payload:
        raise HTTPException(status_code=401, detail="Malformed token format.")

    user_id_str, _, user_email = payload.partition("-")
    
    user = None
    try:
        user_id = int(user_id_str)
        user = session.exec(select(User).where(User.id == user_id)).first()
    except ValueError:
        user = session.exec(select(User).where(User.email == user_email.strip().lower())).first()

    if not user:
        raise HTTPException(status_code=401, detail="Inspector account not found or session revoked.")

    return user.to_dict()

