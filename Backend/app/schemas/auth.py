"""Authentication request and response schemas."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator

class RegisterRequest(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=120)
    role: str = Field(default="inspector", max_length=50)

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_identifier(self):
        if not self.username and not self.email:
            raise ValueError("Either 'username' or 'email' must be provided.")
        return self

class UserRead(BaseModel):
    id: int
    username: Optional[str] = None
    email: str
    full_name: str
    role: str
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
