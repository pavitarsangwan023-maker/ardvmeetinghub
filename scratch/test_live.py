import asyncio
import socketio
import requests

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"
MEETING_ID = "6C92-14CE-3AE4"

async def main():
    print("Logging in as Guest...")
    res = requests.post(f"{API_URL}/auth/guest", json={"name": "TestAI"})
    if res.status_code not in (200, 201):
        print("Guest login failed", res.text)
        return
    token = res.json()["access_token"]
    print("Logged in. Token:", token)

    sio = socketio.AsyncClient(logger=False, engineio_logger=False)

    @sio.event
    async def connect():
        print(f"Connected to WebSocket! SID: {sio.get_sid()}")
        await sio.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })

    @sio.on("room-joined")
    async def on_room_joined(data):
        print(f"Room Joined. Participants: {[p['name'] for p in data['participants']]}")

    @sio.on("waiting-room")
    async def on_waiting_room(data):
        print(f"Entered Waiting Room for {MEETING_ID}")

    @sio.on("participant-list")
    async def on_participant_list(data):
        print(f"Participant list update: {[p['name'] for p in data['participants']]}")

    @sio.on("user-joined")
    async def on_user_joined(data):
        print(f"User Joined: {data['user']['name']}")

    await sio.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    await asyncio.sleep(60)
    await sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
