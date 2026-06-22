import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.database import Base, engine
from app.models import Meeting, MeetingParticipant, User, ChatMessage, BookingProfile, BookingAvailability  # noqa: F401
from app.routes import auth, meetings, scheduler
from app.websocket.signaling import sio

Base.metadata.create_all(bind=engine)

from app.utils.rate_limit import limiter

fastapi_app = FastAPI(title=settings.app_name, version="1.0.0")
fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@fastapi_app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
fastapi_app.include_router(auth.router)
fastapi_app.include_router(meetings.router)
fastapi_app.include_router(scheduler.router)


@fastapi_app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok", "service": settings.app_name}


app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")
