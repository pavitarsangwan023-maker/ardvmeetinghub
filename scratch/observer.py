import asyncio
import socketio
import requests

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"
MEETING_ID = "6C92-14CE-3AE4"

async def main():
    print("Logging in as Guest...")
    res = requests.post(f"{API_URL}/auth/guest", json={"name": "Observer Bot"})
    token = res.json()["access_token"]
    
    sio = socketio.AsyncClient(logger=False, engineio_logger=False)

    @sio.event
    async def connect():
        print(f"Connected! SID: {sio.get_sid()}")
        await sio.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })

    @sio.on("participant-list")
    async def on_part_list(data):
        print(f"Participant List UPDATE: {len(data['participants'])} users")
        for p in data['participants']:
            print(f" - {p['name']} (SID: {p['sid']}, ID: {p['id']})")

    @sio.on("user-joined")
    async def on_user_joined(data):
        print(f"User Joined: {data['user']['name']} (SID: {data['user']['sid']})")
        
    @sio.on("user-left")
    async def on_user_left(data):
        print(f"User Left: SID: {data['sid']}")

    await sio.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    print("Observing for 60 seconds...")
    await asyncio.sleep(60)
    await sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
