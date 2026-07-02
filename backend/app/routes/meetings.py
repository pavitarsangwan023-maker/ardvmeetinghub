from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os

from app.database import get_db
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingJoin, MeetingOut
from app.services.auth_service import get_current_user
from app.services.meeting_service import add_participant, create_meeting, get_meeting, list_user_meetings

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create(payload: MeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_meeting(db, current_user, payload)


@router.get("", response_model=list[MeetingOut])
def history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_user_meetings(db, current_user)


@router.get("/{meeting_id}", response_model=MeetingOut)
def details(meeting_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = get_meeting(db, meeting_id)
    
    if meeting.host_id == current_user.id and not meeting.is_active and not meeting.ended_at:
        meeting.is_active = True
        db.commit()
        db.refresh(meeting)

    # If meeting hasn't started, participants cannot view it
    if current_user.id != meeting.host_id and not meeting.started_at:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Meeting has ended")
    
    return meeting


@router.post("/join", response_model=MeetingOut)
def join(payload: MeetingJoin, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = get_meeting(db, payload.meeting_id)
    
    if meeting.host_id == current_user.id and not meeting.is_active and not meeting.ended_at:
        meeting.is_active = True
        db.commit()
        db.refresh(meeting)
    if not meeting.is_active:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Meeting has ended")
    
    # Start the meeting when the host joins for the first time
    if not meeting.started_at and meeting.host_id == current_user.id:
        now_utc = datetime.now(timezone.utc)
        if meeting.created_at.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=None)
        meeting.started_at = now_utc
        db.commit()
        db.refresh(meeting)

    # If meeting hasn't started, participants cannot join/view it
    if current_user.id != meeting.host_id and not meeting.started_at:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Meeting has ended")

    if not meeting.waiting_room_enabled or meeting.host_id == current_user.id:
        add_participant(db, meeting, current_user)
    return get_meeting(db, payload.meeting_id)

from app.models.chat import ChatMessage

@router.get("/{meeting_id}/chat")
def get_chat(meeting_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    messages = db.query(ChatMessage).filter(ChatMessage.meeting_id == meeting_id).order_by(ChatMessage.created_at.asc()).all()
    
    return [
        {
            "id": msg.id,
            "message": msg.message,
            "sentAt": msg.created_at.isoformat(),
            "user": {
                "id": msg.user.id,
                "name": msg.user.name,
                "email": msg.user.email,
                "avatar_color": msg.user.avatar_color,
            }
        }
        for msg in messages
    ]

@router.get("/turn/credentials")
def get_turn_credentials():
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    if not account_sid or not auth_token:
        # Fallback to public google stun
        return {
            "iceServers": [
                {"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}
            ]
        }
        
    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        token = client.tokens.create()
        return {
            "iceServers": token.ice_servers
        }
    except Exception as e:
        print(f"Error generating Twilio token: {e}")
        return {
            "iceServers": [
                {"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}
            ]
        }
