"""User repository for authentication queries."""

from typing import Optional
from sqlmodel import Session, select
from app.models.user import User
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, session: Session):
        super().__init__(User, session)

    def get_by_email(self, email: str) -> Optional[User]:
        clean_email = email.strip().lower()
        return self.session.exec(select(User).where(User.email == clean_email)).first()
