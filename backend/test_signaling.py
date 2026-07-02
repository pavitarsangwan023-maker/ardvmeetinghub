import asyncio
import socketio
import requests

API_URL = "http://localhost:8000"
sio1 = socketio.AsyncClient(logger=False, engineio_logger=False)
sio2 = socketio.AsyncClient(logger=False, engineio_logger=False)

@sio1.on("room-joined")
def on_room_joined_1(data):
    print("User 1 Room Joined:", data)

@sio2.on("room-joined")
def on_room_joined_2(data):
    print("User 2 Room Joined:", data)

@sio1.on("participant-list")
def on_participant_list_1(data):
    print("User 1 Participant List:", [p['id'] for p in data.get('participants',[])])

@sio2.on("participant-list")
def on_participant_list_2(data):
    print("User 2 Participant List:", [p['id'] for p in data.get('participants',[])])

@sio2.on("waiting-room")
def on_waiting_room_2(data):
    print("User 2 Waiting Room:", data)

async def main():
    # 1. Register two users
    res1 = requests.post(f"{API_URL}/api/auth/register", json={"name":"User 1","email":"u1@test.com","password":"password"})
    res2 = requests.post(f"{API_URL}/api/auth/register", json={"name":"User 2","email":"u2@test.com","password":"password"})
    
    # Login
    l1 = requests.post(f"{API_URL}/api/auth/login", json={"email":"u1@test.com","password":"password"})
    l2 = requests.post(f"{API_URL}/api/auth/login", json={"email":"u2@test.com","password":"password"})
    
    print(l1.json())
    token1 = l1.json()["access_token"]
    token2 = l2.json()["access_token"]

    # Create meeting
    m = requests.post(f"{API_URL}/api/meetings", json={"title":"Test","start_time":"2027-01-01T00:00:00Z","duration_minutes":60, "waiting_room_enabled": False}, headers={"Authorization": f"Bearer {token1}"})
    meeting_id = m.json()["meeting_id"]

    # Connect socket 1
    await sio1.connect(API_URL, socketio_path="/socket.io", auth={"token": token1}, transports=['polling'])
    await sio1.emit("join-room", {"meetingId": meeting_id, "micEnabled": True, "cameraEnabled": True})
    await asyncio.sleep(1)

    # Connect socket 2
    await sio2.connect(API_URL, socketio_path="/socket.io", auth={"token": token2}, transports=['polling'])
    await sio2.emit("join-room", {"meetingId": meeting_id, "micEnabled": True, "cameraEnabled": True})
    
    await asyncio.sleep(2)
    
    print("Test finished.")
    await sio1.disconnect()
    await sio2.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
