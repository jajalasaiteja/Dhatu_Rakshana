"""Security utilities: password hashing, verification, and signed JWT token operations."""

import datetime
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import hashlib
import bcrypt
import jwt

from app.core.config import settings

def hash_password(password: str) -> str:
    """Hash password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hashed representation.
    Supports bcrypt and auto-detects legacy sha256 hashes from prototype seed data.
    """
    if not hashed_password:
        return False

    # Check for legacy SHA-256 hash (64 hex characters)
    if len(hashed_password) == 64 and not hashed_password.startswith("$"):
        legacy_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return legacy_hash == hashed_password

    # Standard bcrypt check
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "dhatu-rakshana-auth"
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT access token. Also supports prototype token format for seamless transitions."""
    if not token:
        return None

    # Support prototype token format fallback: "dhatu-jwt-token-{id}-{email}"
    prefix = "dhatu-jwt-token-"
    if token.startswith(prefix):
        payload = token[len(prefix):]
        if "-" in payload:
            user_id_str, _, email = payload.partition("-")
            return {
                "sub": email,
                "user_id": int(user_id_str) if user_id_str.isdigit() else None,
                "email": email,
                "role": "inspector"
            }

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except (jwt.PyJWTError, Exception):
        return None
