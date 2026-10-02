"""Authentication service handling registration, login, and token issuance."""

from typing import Dict, Any, Optional
from sqlmodel import Session, select, or_
from datetime import datetime, timezone
import logging

from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import DhatuRakshanaError

logger = logging.getLogger("dhatu_rakshana.service.auth")

class AuthService:
    def __init__(self, session: Session):
        self.session = session

    def register(
        self,
        email: str,
        password: str,
        full_name: str,
        username: Optional[str] = None,
        role: str = "inspector"
    ) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower() if username else clean_email.split("@")[0]

        existing = self.session.exec(
            select(User).where(or_(User.email == clean_email, User.username == clean_username))
        ).first()
        if existing:
            raise DhatuRakshanaError(
                "An account with this email or username already exists. Please log in.",
                status_code=400,
                error_code="USER_EXISTS"
            )

        new_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=hash_password(password),
            full_name=full_name.strip() or "Naval Defense Inspector",
            role=role,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        self.session.add(new_user)
        self.session.commit()
        self.session.refresh(new_user)

        logger.info(f"Registered new certified user: username={clean_username}, email={clean_email}, role={role}")
        return {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role
        }

    def login(self, identifier: Optional[str] = None, password: str = "", email: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        """
        Authenticates user with username or email, verifies password and active status, and issues signed JWT.
        """
        login_key = (identifier or username or email or "").strip().lower()
        if not login_key:
            logger.warning("User login failed: missing username or email identifier.")
            raise DhatuRakshanaError("Username or email is required.", status_code=400, error_code="MISSING_CREDENTIALS")

        user = self.session.exec(
            select(User).where(or_(User.email == login_key, User.username == login_key))
        ).first()

        if not user or not verify_password(password, user.password_hash):
            logger.warning(f"User login failed: invalid credentials for identifier '{login_key}'")
            raise DhatuRakshanaError(
                "Invalid credentials or inspector account not registered.",
                status_code=401,
                error_code="INVALID_CREDENTIALS"
            )

        # Check if user account is active
        if not getattr(user, "is_active", True):
            logger.warning(f"User login rejected: account is inactive for identifier '{login_key}'")
            raise DhatuRakshanaError(
                "User account is inactive. Please contact system administrator.",
                status_code=403,
                error_code="ACCOUNT_INACTIVE"
            )

        # Automatically upgrade legacy sha256 hashes to bcrypt if applicable
        if len(user.password_hash) == 64 and not user.password_hash.startswith("$"):
            user.password_hash = hash_password(password)
            self.session.add(user)
            self.session.commit()
            logger.info(f"Upgraded password hash for {user.email} to bcrypt.")

        access_token = create_access_token({
            "sub": user.email,
            "username": user.username,
            "user_id": user.id,
            "role": user.role
        })

        logger.info(f"User login successful: {user.email} (role: {user.role})")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username or user.email.split("@")[0],
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active
            }
        }
