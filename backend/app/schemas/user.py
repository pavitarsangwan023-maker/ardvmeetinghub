from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GuestLogin(BaseModel):
    name: str = Field(min_length=2, max_length=120)

class UserResetPassword(BaseModel):
    email: EmailStr
    name: str
    new_password: str = Field(min_length=8, max_length=128)


class UserProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=8, max_length=128)
    profile_pic: str | None = None


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    avatar_color: str
    profile_pic: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
