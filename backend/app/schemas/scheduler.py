from datetime import time, date
from pydantic import BaseModel, Field

class BookingAvailabilityBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    is_enabled: bool = True

class BookingAvailabilityCreate(BookingAvailabilityBase):
    pass

class BookingAvailabilityOut(BookingAvailabilityBase):
    id: int

    model_config = {"from_attributes": True}

class BookingProfileBase(BaseModel):
    slug: str = Field(min_length=3, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    duration_minutes: int = Field(default=30, gt=0)

class BookingProfileCreate(BookingProfileBase):
    pass

class BookingProfileUpdate(BookingProfileBase):
    availabilities: list[BookingAvailabilityCreate]

class BookingProfileOut(BookingProfileBase):
    id: int
    user_id: int
    availabilities: list[BookingAvailabilityOut]

    model_config = {"from_attributes": True}

class PublicBookingProfileOut(BaseModel):
    slug: str
    title: str
    description: str
    duration_minutes: int
    host_name: str
    host_avatar: str

class Slot(BaseModel):
    start_time: str
    end_time: str

class BookSlotRequest(BaseModel):
    date: date
    start_time: time
    guest_name: str = Field(min_length=1, max_length=120)
    guest_email: str = Field(min_length=3, max_length=255)
