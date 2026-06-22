from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from typing import Any
from datetime import datetime, timezone

import socketio

from app.database import SessionLocal
from app.models.meeting import Meeting
from app.models.user import User
from app.services.meeting_service import end_participation, get_meeting
from app.services.ai_service import get_ai_response
from app.utils.security import decode_token
from app.models.chat import ChatMessage
from app.config import settings

def _sync_save_chat(meeting_id: str, user_id: int, message: str):
    db = SessionLocal()
    try:
        chat = ChatMessage(meeting_id=meeting_id, user_id=user_id, message=message)
        db.add(chat)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@dataclass
class RoomUser:
    sid: str
    id: int
    name: str
    email: str
    avatar_color: str
    is_host: bool
    is_co_host: bool = False
    is_waiting: bool = False


rooms: dict[str, dict[str, RoomUser]] = {}
sid_to_room: dict[str, str] = {}
sid_to_user: dict[str, RoomUser] = {}
waiting_rooms: dict[str, dict[str, RoomUser]] = {}
chat_enabled_rooms: dict[str, bool] = {}


def _serialize(room: dict[str, RoomUser]) -> list[dict[str, Any]]:
    return [asdict(user) for user in room.values()]


def _sync_get_user(token: str | None) -> User | None:
    if not token:
        return None
    payload = decode_token(token.replace("Bearer ", ""))
    if not payload or not payload.get("sub"):
        return None
    db = SessionLocal()
    try:
        return db.get(User, int(payload["sub"]))
    finally:
        db.close()


def _sync_get_meeting(meeting_id: str):
    db = SessionLocal()
    try:
        return get_meeting(db, meeting_id)
    finally:
        db.close()


def _sync_end_participation(meeting_id: str, user_id: int, removed: bool = False):
    db = SessionLocal()
    try:
        end_participation(db, meeting_id, user_id, removed=removed)
    finally:
        db.close()


@sio.event
async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None):
    user = await asyncio.to_thread(_sync_get_user, (auth or {}).get("token"))
    if not user:
        raise ConnectionRefusedError("Authentication required")
    sid_to_user[sid] = RoomUser(sid=sid, id=user.id, name=user.name, email=user.email, avatar_color=user.avatar_color, is_host=False, is_co_host=False)
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.on("join-room")
async def join_room(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    meeting = await asyncio.to_thread(_sync_get_meeting, meeting_id)

    user = sid_to_user[sid]
    user.is_host = meeting.host_id == user.id

    if not meeting.started_at and user.is_host:
        db = SessionLocal()
        try:
            m = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
            if m and not m.started_at:
                m.started_at = datetime.now(timezone.utc)
                db.commit()
                meeting.started_at = m.started_at
        finally:
            db.close()

    room = rooms.setdefault(meeting_id, {})
    waiting = waiting_rooms.setdefault(meeting_id, {})

    if meeting.waiting_room_enabled and not user.is_host:
        user.is_waiting = True
        waiting[sid] = user
        await sio.enter_room(sid, f"waiting:{meeting_id}")
        await sio.emit("waiting-room", {"meetingId": meeting_id}, to=sid)
        await sio.emit("waiting-list", {"participants": _serialize(waiting)}, room=meeting_id)
        return

    user.is_waiting = False
    room[sid] = user
    sid_to_room[sid] = meeting_id
    await sio.enter_room(sid, meeting_id)
    payload = {
        "meetingId": meeting_id,
        "self": asdict(user),
        "participants": _serialize(room),
        "durationLimit": meeting.duration_limit_minutes,
        "startedAt": meeting.started_at.isoformat() if meeting.started_at else None
    }
    await sio.emit("room-joined", payload, to=sid)
    await sio.emit("participant-list", {"participants": _serialize(room)}, room=meeting_id)
    await sio.emit("user-joined", {"user": asdict(user)}, room=meeting_id, skip_sid=sid)


@sio.on("admit-participant")
async def admit_participant(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if not host:
        return
        
    target_user = waiting_rooms.get(meeting_id, {}).get(target_sid)
    if not target_user:
        return
        
    if host.is_co_host and not host.is_host:
        # Intercept action and proxy to primary host
        room = rooms.get(meeting_id, {})
        for peer_sid, peer_user in room.items():
            if peer_user.is_host:
                await sio.emit("cohost-action-request", {
                    "action": "admit-participant",
                    "target_sid": target_sid,
                    "target_name": target_user.name,
                    "co_host_name": host.name,
                    "co_host_sid": sid,
                    "meetingId": meeting_id
                }, to=peer_sid)
                break
        return

    if not host.is_host:
        return
    user = waiting_rooms.get(meeting_id, {}).pop(target_sid, None)
    if not user:
        return
    user.is_waiting = False
    rooms.setdefault(meeting_id, {})[target_sid] = user
    sid_to_room[target_sid] = meeting_id
    await sio.leave_room(target_sid, f"waiting:{meeting_id}")
    await sio.enter_room(target_sid, meeting_id)
    await sio.emit("room-joined", {"meetingId": meeting_id, "self": asdict(user), "participants": _serialize(rooms[meeting_id])}, to=target_sid)
    await sio.emit("participant-list", {"participants": _serialize(rooms[meeting_id])}, room=meeting_id)
    await sio.emit("user-joined", {"user": asdict(user)}, room=meeting_id, skip_sid=target_sid)


@sio.on("waiting-list")
async def waiting_list(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    host = sid_to_user.get(sid)
    if host and host.is_host:
        await sio.emit("waiting-list", {"participants": _serialize(waiting_rooms.get(meeting_id, {}))}, to=sid)


@sio.on("offer")
async def offer(sid: str, data: dict[str, Any]):
    target = data.get("to")
    if not target or not isinstance(target, str) or target not in sid_to_room or sid_to_room[target] != sid_to_room.get(sid):
        return
    await sio.emit("offer", {**data, "from": sid}, to=target)


@sio.on("answer")
async def answer(sid: str, data: dict[str, Any]):
    target = data.get("to")
    if not target or not isinstance(target, str) or target not in sid_to_room or sid_to_room[target] != sid_to_room.get(sid):
        return
    await sio.emit("answer", {**data, "from": sid}, to=target)


@sio.on("ice-candidate")
async def ice_candidate(sid: str, data: dict[str, Any]):
    target = data.get("to")
    if not target or not isinstance(target, str) or target not in sid_to_room or sid_to_room[target] != sid_to_room.get(sid):
        return
    await sio.emit("ice-candidate", {**data, "from": sid}, to=target)


@sio.on("chat-message")
async def chat_message(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    user = sid_to_user.get(sid)
    if meeting_id and user:
        if not chat_enabled_rooms.get(meeting_id, True) and not user.is_host:
            return
        message_text = data.get("message", "")
        target_sid = data.get("to")
        
        # Check if message is for AI bot
        is_ai_command = message_text.lower().startswith("@ai ")
        if is_ai_command and not target_sid:
            # Broadcast the user's message first
            await asyncio.to_thread(_sync_save_chat, meeting_id, user.id, message_text)
            await sio.emit("chat-message", {"message": message_text, "user": asdict(user), "sentAt": data.get("sentAt")}, room=meeting_id, skip_sid=sid)
            
            # Send AI processing indicator (optional, but good UX)
            # await sio.emit("chat-message", {"message": "Typing...", "user": {"name": "AI Assistant", "avatar_color": "#10B981"}, "isSystem": True}, room=meeting_id)

            # Process AI request asynchronously
            prompt = message_text[4:].strip()
            ai_reply = await asyncio.to_thread(get_ai_response, prompt)
            
            # Broadcast AI response
            ai_user = {"id": -1, "name": "AI Assistant 🤖", "email": "ai@pymeet.local", "avatar_color": "#10B981"}
            await sio.emit("chat-message", {"message": ai_reply, "user": ai_user, "sentAt": datetime.now(timezone.utc).isoformat()}, room=meeting_id)
            return

        if target_sid and target_sid in sid_to_room and sid_to_room[target_sid] == meeting_id:
            await sio.emit("chat-message", {"message": message_text, "user": asdict(user), "sentAt": data.get("sentAt"), "isPrivate": True}, to=target_sid)
            
            target_user = sid_to_user.get(target_sid)
            if not user.is_host and target_user and not target_user.is_host:
                room = rooms.get(meeting_id, {})
                for peer_sid, peer_user in room.items():
                    if peer_user.is_host:
                        await sio.emit("chat-message", {"message": message_text, "user": asdict(user), "sentAt": data.get("sentAt"), "isIntercepted": True, "toUser": target_user.name}, to=peer_sid)
                        break
        else:
            await asyncio.to_thread(_sync_save_chat, meeting_id, user.id, message_text)
            await sio.emit("chat-message", {"message": message_text, "user": asdict(user), "sentAt": data.get("sentAt")}, room=meeting_id, skip_sid=sid)


@sio.on("toggle-chat")
async def toggle_chat(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    user = sid_to_user.get(sid)
    if meeting_id and user and user.is_host:
        enabled = data.get("enabled", True)
        chat_enabled_rooms[meeting_id] = enabled
        await sio.emit("chat-status-changed", {"enabled": enabled}, room=meeting_id)


@sio.on("end-meeting")
async def handle_end_meeting(sid: str, data: dict[str, Any]):
    meeting_id = data.get("meetingId", "")
    if sid not in sid_to_user or not sid_to_user[sid].is_host:
        return
    db = SessionLocal()
    try:
        m = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
        if m:
            m.is_active = False
            m.ended_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
    await sio.emit("meeting-ended", room=meeting_id)


@sio.on("send-reaction")
async def send_reaction(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    user = sid_to_user.get(sid)
    if meeting_id and user:
        await sio.emit("receive-reaction", {"emoji": data.get("emoji"), "userId": user.id, "userName": user.name}, room=meeting_id, skip_sid=sid)


@sio.on("request-record")
async def request_record(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    user = sid_to_user.get(sid)
    if meeting_id and user:
        room = rooms.get(meeting_id, {})
        for peer_sid, peer_user in room.items():
            if peer_user.is_host:
                await sio.emit("recording-requested", {"userId": user.id, "userName": user.name, "sid": sid}, to=peer_sid)
                break


@sio.on("approve-record")
async def approve_record(sid: str, data: dict[str, Any]):
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if host and host.is_host and target_sid:
        await sio.emit("recording-approved", {}, to=target_sid)


@sio.on("deny-record")
async def deny_record(sid: str, data: dict[str, Any]):
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if host and host.is_host and target_sid:
        await sio.emit("recording-denied", {}, to=target_sid)


@sio.on("remove-participant")
async def remove_participant(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if not host:
        return
        
    room = rooms.get(meeting_id, {})
    target_user = room.get(target_sid)
    if not target_user:
        return
        
    if host.is_co_host and not host.is_host:
        # Intercept action and proxy to primary host
        for peer_sid, peer_user in room.items():
            if peer_user.is_host:
                await sio.emit("cohost-action-request", {
                    "action": "remove-participant",
                    "target_sid": target_sid,
                    "target_name": target_user.name,
                    "co_host_name": host.name,
                    "co_host_sid": sid,
                    "meetingId": meeting_id
                }, to=peer_sid)
                break
        return

    if not host.is_host:
        return

    target = room.pop(target_sid, None)
    if target:
        await asyncio.to_thread(_sync_end_participation, meeting_id, target.id, True)
        await sio.emit("removed-from-room", {"meetingId": meeting_id}, to=target_sid)
        await sio.disconnect(target_sid)
        await sio.emit("participant-list", {"participants": _serialize(room)}, room=meeting_id)

@sio.on("grant-co-host")
async def grant_co_host(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if not host or not host.is_host:
        return
    room = rooms.get(meeting_id, {})
    if target_sid in room:
        room[target_sid].is_co_host = True
        await sio.emit("participant-list", {"participants": _serialize(room)}, room=meeting_id)

@sio.on("revoke-co-host")
async def revoke_co_host(sid: str, data: dict[str, Any]):
    meeting_id = str(data.get("meetingId", "")).upper()
    target_sid = data.get("sid")
    host = sid_to_user.get(sid)
    if not host or not host.is_host:
        return
    room = rooms.get(meeting_id, {})
    if target_sid in room:
        room[target_sid].is_co_host = False
        await sio.emit("participant-list", {"participants": _serialize(room)}, room=meeting_id)

@sio.on("deny-cohost-action")
async def deny_cohost_action(sid: str, data: dict[str, Any]):
    host = sid_to_user.get(sid)
    if not host or not host.is_host:
        return
    co_host_sid = data.get("co_host_sid")
    if co_host_sid:
        await sio.emit("cohost-action-denied", {
            "action": data.get("action"),
            "target_name": data.get("target_name")
        }, to=co_host_sid)


@sio.on("whiteboard-draw")
async def whiteboard_draw(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    if meeting_id:
        await sio.emit("whiteboard-draw", data, room=meeting_id, skip_sid=sid)

@sio.on("whiteboard-clear")
async def whiteboard_clear(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    if meeting_id:
        await sio.emit("whiteboard-clear", data, room=meeting_id, skip_sid=sid)

@sio.on("request-whiteboard")
async def request_whiteboard(sid: str, data: dict[str, Any]):
    meeting_id = sid_to_room.get(sid)
    if meeting_id:
        await sio.emit("request-whiteboard", {"requesterSid": sid}, room=meeting_id, skip_sid=sid)

@sio.on("sync-whiteboard")
async def sync_whiteboard(sid: str, data: dict[str, Any]):
    target_sid = data.get("targetSid")
    if target_sid and target_sid in sid_to_room:
        await sio.emit("sync-whiteboard", {"state": data.get("state")}, to=target_sid)


@sio.on("user-left")
async def user_left(sid: str, data: dict[str, Any] | None = None):
    await _leave(sid)


@sio.event
async def disconnect(sid: str):
    await _leave(sid)


async def _leave(sid: str):
    meeting_id = sid_to_room.pop(sid, None)
    user = sid_to_user.get(sid)

    # Clean up waiting room entries
    for wm_id, waiting in list(waiting_rooms.items()):
        if sid in waiting:
            waiting.pop(sid, None)
            await sio.leave_room(sid, f"waiting:{wm_id}")
            # Notify host of updated waiting list
            await sio.emit("waiting-list", {"participants": _serialize(waiting)}, room=wm_id)
            if not waiting:
                del waiting_rooms[wm_id]

    if not meeting_id or not user:
        sid_to_user.pop(sid, None)
        return
    rooms.get(meeting_id, {}).pop(sid, None)
    
    if user.is_host:
        await sio.emit("meeting-ended", {"message": "The host has ended the meeting."}, room=meeting_id)
        
        def _sync_deactivate_meeting(code: str):
            db = SessionLocal()
            try:
                m = db.query(Meeting).filter(Meeting.meeting_id == code).first()
                if m:
                    m.is_active = False
                    m.ended_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        await asyncio.to_thread(_sync_deactivate_meeting, meeting_id)
    
    # Clean up empty rooms
    if meeting_id in rooms and not rooms[meeting_id]:
        del rooms[meeting_id]
        
    await asyncio.to_thread(_sync_end_participation, meeting_id, user.id)
    await sio.emit("user-left", {"sid": sid, "userId": user.id}, room=meeting_id)
    await sio.emit("participant-list", {"participants": _serialize(rooms.get(meeting_id, {}))}, room=meeting_id)
    sid_to_user.pop(sid, None)
