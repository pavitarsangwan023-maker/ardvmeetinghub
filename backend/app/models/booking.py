from sqlalchemy import Integer, String, ForeignKey, Boolean, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import time

from app.database import Base

class BookingProfile(Base):
    __tablename__ = "booking_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), default="30 mins with me")
    description: Mapped[str] = mapped_column(String(500), default="Let's have a quick chat.")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    
    user = relationship("User", back_populates="booking_profile")
    availabilities = relationship("BookingAvailability", back_populates="profile", cascade="all, delete-orphan")


class BookingAvailability(Base):
    __tablename__ = "booking_availabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("booking_profiles.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False) # 0 = Monday, 6 = Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(9, 0))
    end_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(17, 0))
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    profile = relationship("BookingProfile", back_populates="availabilities")
