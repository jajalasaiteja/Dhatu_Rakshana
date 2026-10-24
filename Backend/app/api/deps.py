"""FastAPI dependency injection utilities for sessions, OpenAPI security scheme, and RBAC."""

from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select, or_
import logging

from app.db.session import get_session
from app.models.user import User
from app.core.security import decode_access_token

logger = logging.getLogger("dhatu_rakshana.auth.deps")

# OpenAPI Bearer security scheme for interactive Swagger UI
http_bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> User:
    """Extracts and validates current authenticated user from Bearer header or Authorization credentials."""
    token = None
    if auth_creds and auth_creds.credentials:
        token = auth_creds.credentials
    elif authorization:
        scheme, _, raw_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and raw_token:
            token = raw_token.strip()

    if not token:
        logger.warning("Unauthenticated request: missing Bearer token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header or Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        logger.warning("Authentication failed: invalid or expired token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Reject visitor tokens from inspector endpoints
    if payload.get("role") == "visitor" or payload.get("type") == "visitor":
        logger.warning(f"Visitor token attempted to access inspector endpoint: {payload.get('sub')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Visitor credentials cannot access inspector resources."
        )

    user_email = payload.get("sub") or payload.get("email")
    user_id = payload.get("user_id")
    user_name = payload.get("username")

    user = None
    if user_id:
        user = session.get(User, user_id)
    if not user and (user_email or user_name):
        conditions = []
        if user_email:
            conditions.append(User.email == user_email)
        if user_name:
            conditions.append(User.username == user_name)
        user = session.exec(select(User).where(or_(*conditions))).first()

    if not user:
        logger.warning(f"Authentication failed: user record not found for sub={user_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Certified user account not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not getattr(user, "is_active", True):
        logger.warning(f"Authentication rejected: user account {user.email} is inactive.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Contact administrator."
        )

    return user

def get_optional_current_user(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """Extracts user if header is present, else None without raising 401."""
    if not auth_creds and not authorization:
        return None
    try:
        return get_current_user(auth_creds, authorization, session)
    except HTTPException:
        return None

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory checking that current user has one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").lower()
        normalized_allowed = [r.lower() for r in allowed_roles]
        if user_role not in normalized_allowed:
            logger.warning(
                f"Unauthorized access attempt: user '{current_user.email}' (role={current_user.role}) "
                f"attempted to access endpoint requiring {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have permission to perform this action."
            )
        return current_user
    return role_checker

# Convenience RBAC dependencies
require_admin = require_roles("admin")
require_inspector = require_roles("admin", "inspector")
require_viewer = require_roles("admin", "inspector", "viewer")

class VisitorSession:
    """Represents an active visitor access session."""
    def __init__(self, username: str, session_id: Optional[str] = None):
        self.username = username
        self.session_id = session_id
        self.role = "visitor"

    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "session_id": self.session_id,
            "role": self.role
        }

def get_current_visitor(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    authorization: Optional[str] = Header(None)
) -> VisitorSession:
    """Extracts and validates visitor access token for read-only records viewing."""
    token = None
    if auth_creds and auth_creds.credentials:
        token = auth_creds.credentials
    elif authorization:
        scheme, _, raw_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and raw_token:
            token = raw_token.strip()

    if not token:
        logger.warning("Visitor request missing Bearer token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing visitor access credential or Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        logger.warning("Visitor authentication failed: invalid or expired token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired visitor session.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Enforce that this token is specifically a visitor token
    if payload.get("role") != "visitor" and payload.get("type") != "visitor":
        logger.warning(f"Non-visitor token presented to visitor endpoint: {payload.get('sub')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Endpoint requires a visitor access token."
        )

    username = payload.get("visitor_username") or payload.get("sub")
    if username and str(username).startswith("visitor:"):
        username = str(username)[len("visitor:"):]

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid visitor credentials payload."
        )

    session_id = payload.get("session_id")
    return VisitorSession(username=username, session_id=session_id)

def get_current_viewer_or_visitor(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """Validates that caller is either an authenticated inspector (viewer/inspector/admin) or an authorized visitor."""
    token = None
    if auth_creds and auth_creds.credentials:
        token = auth_creds.credentials
    elif authorization:
        scheme, _, raw_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and raw_token:
            token = raw_token.strip()

    if not token:
        logger.warning("Unauthenticated request: missing Bearer token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header or Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        logger.warning("Authentication failed: invalid or expired token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check if this is a visitor token
    if payload.get("role") == "visitor" or payload.get("type") == "visitor":
        username = payload.get("visitor_username") or payload.get("sub")
        if username and str(username).startswith("visitor:"):
            username = str(username)[len("visitor:"):]
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid visitor credentials payload."
            )
        session_id = payload.get("session_id")
        return VisitorSession(username=username, session_id=session_id)

    # Otherwise validate inspector / certified user
    user_email = payload.get("sub") or payload.get("email")
    user_id = payload.get("user_id")
    user_name = payload.get("username")

    user = None
    if user_id:
        user = session.get(User, user_id)
    if not user and (user_email or user_name):
        conditions = []
        if user_email:
            conditions.append(User.email == user_email)
        if user_name:
            conditions.append(User.username == user_name)
        user = session.exec(select(User).where(or_(*conditions))).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Certified user account not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Contact administrator."
        )

    return user
