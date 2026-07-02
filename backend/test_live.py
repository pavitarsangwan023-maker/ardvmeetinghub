import asyncio
import socketio
import requests

API_URL = "https://api.ardvmeetinghub.com"
# First we need a token. We can register a test user.
try:
    requests.post(f"{API_URL}/api/auth/register", json={"name":"Tester","email":"test101@test.com","password":"password"})
except:
    pass
l = requests.post(f"{API_URL}/api/auth/login", data={"username":"test101@test.com","password":"password"})
token = l.json().get("access_token")
print("Token:", token[:10] if token else None)

sio = socketio.AsyncClient(logger=True, engineio_logger=True)

@sio.event
async def connect():
    print("Connected to live server!")
    # Create meeting
    m = requests.post(f"{API_URL}/api/meetings", json={"title":"Test","start_time":"2027-01-01T00:00:00Z","duration_minutes":60}, headers={"Authorization": f"Bearer {token}"})
    meeting_id = m.json().get("meeting_id")
    print("Meeting ID:", meeting_id)
    await sio.emit("join-room", {"meetingId": meeting_id, "micEnabled": True, "cameraEnabled": True})

@sio.event
async def disconnect():
    print("Disconnected!")

@sio.on("room-joined")
def on_room_joined(data):
    print("Room Joined:", data)

@sio.on("participant-list")
def on_participant_list(data):
    print("Participant List:", data)

async def main():
    if not token:
        print("Failed to get token")
        return
    await sio.connect(API_URL, socketio_path="/socket.io", auth={"token": token}, transports=['polling'])
    await asyncio.sleep(10)
    await sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
