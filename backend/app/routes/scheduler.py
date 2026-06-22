from datetime import date, datetime, timedelta, timezone, time as dt_time
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BookingProfile, BookingAvailability, User, Meeting
from app.routes.auth import get_current_user
from app.schemas.scheduler import (
    BookingProfileOut, BookingProfileUpdate, PublicBookingProfileOut, BookSlotRequest
)

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

def generate_slug(name: str):
    base = "".join(c for c in name.lower() if c.isalnum() or c.isspace()).replace(" ", "-")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{base}-{suffix}"

@router.get("/profile", response_model=BookingProfileOut)
def get_or_create_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(BookingProfile).filter(BookingProfile.user_id == current_user.id).first()
    if not profile:
        slug = generate_slug(current_user.name)
        profile = BookingProfile(
            user_id=current_user.id,
            slug=slug,
            title=f"30 mins with {current_user.name}"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        # Add default availability (Mon-Fri 9-5)
        for day in range(5):
            av = BookingAvailability(
                profile_id=profile.id,
                day_of_week=day,
                start_time=dt_time(9, 0),
                end_time=dt_time(17, 0)
            )
            db.add(av)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=BookingProfileOut)
def update_profile(data: BookingProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(BookingProfile).filter(BookingProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # check if slug is taken by someone else
    existing = db.query(BookingProfile).filter(BookingProfile.slug == data.slug, BookingProfile.id != profile.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already taken")

    profile.slug = data.slug
    profile.title = data.title
    profile.description = data.description
    profile.duration_minutes = data.duration_minutes

    db.query(BookingAvailability).filter(BookingAvailability.profile_id == profile.id).delete()
    for av in data.availabilities:
        db.add(BookingAvailability(
            profile_id=profile.id,
            day_of_week=av.day_of_week,
            start_time=av.start_time,
            end_time=av.end_time,
            is_enabled=av.is_enabled
        ))
    
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/public/{slug}", response_model=PublicBookingProfileOut)
def get_public_profile(slug: str, db: Session = Depends(get_db)):
    profile = db.query(BookingProfile).filter(BookingProfile.slug == slug).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Booking page not found")
    
    return PublicBookingProfileOut(
        slug=profile.slug,
        title=profile.title,
        description=profile.description,
        duration_minutes=profile.duration_minutes,
        host_name=profile.user.name,
        host_avatar=profile.user.avatar_color
    )

@router.get("/public/{slug}/slots")
def get_available_slots(slug: str, target_date: date, db: Session = Depends(get_db)):
    profile = db.query(BookingProfile).filter(BookingProfile.slug == slug).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Booking page not found")
    
    day_of_week = target_date.weekday()
    availabilities = [a for a in profile.availabilities if a.day_of_week == day_of_week and a.is_enabled]
    
    if not availabilities:
        return []

    # Get host's meetings on this date
    # Scheduled for is datetime in UTC. For simplicity, we just filter by the date part or fetch all active upcoming meetings.
    meetings = db.query(Meeting).filter(
        Meeting.host_id == profile.user_id,
        Meeting.scheduled_for >= datetime.combine(target_date, dt_time.min).replace(tzinfo=timezone.utc),
        Meeting.scheduled_for <= datetime.combine(target_date, dt_time.max).replace(tzinfo=timezone.utc),
        Meeting.is_active.is_(True)
    ).all()

    booked_times = [m.scheduled_for.time() for m in meetings if m.scheduled_for]

    slots = []
    duration = timedelta(minutes=profile.duration_minutes)

    for av in availabilities:
        current_dt = datetime.combine(target_date, av.start_time)
        end_dt = datetime.combine(target_date, av.end_time)

        while current_dt + duration <= end_dt:
            # Check if current_dt.time() is in booked_times
            if current_dt.time() not in booked_times:
                # Also skip past times if target_date is today
                if current_dt.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
                    slots.append({
                        "start_time": current_dt.time().strftime("%H:%M"),
                        "end_time": (current_dt + duration).time().strftime("%H:%M")
                    })
            current_dt += duration

    return slots

@router.post("/public/{slug}/book")
def book_slot(slug: str, req: BookSlotRequest, db: Session = Depends(get_db)):
    profile = db.query(BookingProfile).filter(BookingProfile.slug == slug).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Booking page not found")
    
    scheduled_dt = datetime.combine(req.date, req.start_time).replace(tzinfo=timezone.utc)
    
    if scheduled_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot book in the past")

    # Generate meeting ID
    meeting_id = "".join(random.choices(string.ascii_uppercase + string.digits, k=12))
    meeting_id = f"{meeting_id[:4]}-{meeting_id[4:8]}-{meeting_id[8:]}"

    new_meeting = Meeting(
        meeting_id=meeting_id,
        title=f"{profile.title} with {req.guest_name}",
        host_id=profile.user_id,
        scheduled_for=scheduled_dt,
        duration_limit_minutes=profile.duration_minutes,
        waiting_room_enabled=True
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    return {"success": True, "meeting_id": meeting_id, "scheduled_for": scheduled_dt}
