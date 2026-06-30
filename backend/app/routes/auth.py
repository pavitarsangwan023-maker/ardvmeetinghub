from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import Token, UserCreate, UserLogin, UserOut, UserProfileUpdate, UserResetPassword, GuestLogin
from app.services.auth_service import authenticate_user, get_current_user, issue_token, register_user, update_user_profile, reset_password
from app.models.user import User
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    user = register_user(db, payload)
    return Token(access_token=issue_token(user), user=user)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return Token(access_token=issue_token(user), user=user)

import uuid

@router.post("/guest", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def guest_login(request: Request, payload: GuestLogin, db: Session = Depends(get_db)):
    # Append (Guest) to the name as requested
    guest_name = f"{payload.name.strip()} (Guest)"
    
    # Create a random email and password for the guest
    guest_id = str(uuid.uuid4())
    guest_email = f"guest_{guest_id[:8]}@guest.local"
    guest_password = guest_id
    
    guest_payload = UserCreate(name=guest_name, email=guest_email, password=guest_password)
    user = register_user(db, guest_payload)
    return Token(access_token=issue_token(user), user=user)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def reset_pwd(request: Request, payload: UserResetPassword, db: Session = Depends(get_db)):
    success = reset_password(db, payload.email, payload.name, payload.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account details do not match or email not found.")
    return {"detail": "Password successfully reset."}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserOut)
def update_profile(payload: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_user_profile(db, current_user, name=payload.name, email=payload.email, password=payload.password, profile_pic=payload.profile_pic)
