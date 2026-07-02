import asyncio
import socketio
import requests
import json

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"
MEETING_ID = "5441-1C19-09F3"

async def create_client(email, password, is_host=False):
    res = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    
    sio = socketio.AsyncClient(logger=False, engineio_logger=False)
    
    @sio.event
    async def connect():
        print(f"[{email}] Connected to WebSocket! SID: {sio.get_sid()}")
        await sio.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })

    @sio.on("room-joined")
    async def on_room_joined(data):
        print(f"[{email}] Room Joined. Participants: {[p['email'] for p in data['participants']]}")

    @sio.on("participant-list")
    async def on_participant_list(data):
        print(f"[{email}] Participant list update: {[p['email'] for p in data['participants']]}")

    @sio.on("user-joined")
    async def on_user_joined(data):
        print(f"[{email}] User Joined: {data['user']['email']}")
        
    await sio.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    return sio

async def main():
    print("Starting Host (wdefr@gmail.com)...")
    host_sio = await create_client("wdefr@gmail.com", "12345678")
    await asyncio.sleep(2)
    
    print("\nStarting Guest (sisskapil@gmail.com)...")
    guest_sio = await create_client("sisskapil@gmail.com", "12345678")
    
    await asyncio.sleep(5)
    
    await host_sio.disconnect()
    await guest_sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
