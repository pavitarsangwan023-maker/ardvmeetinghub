import asyncio
import socketio
import requests
import json
import sys

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"

# Login
login_data = {
    "email": "sisskapil@gmail.com",
    "password": "12345678"
}
res = requests.post(f"{API_URL}/auth/login", json=login_data)
if res.status_code != 200:
    print("Login failed!", res.text)
    sys.exit(1)

token = res.json()["access_token"]
print("Logged in successfully!")

sio = socketio.AsyncClient(logger=True, engineio_logger=True)

@sio.event
async def connect():
    print("Connected to WebSocket!")
    await sio.emit("join-room", {
        "meetingId": "5441-1C19-09F3",
        "micEnabled": False,
        "cameraEnabled": False
    })

@sio.event
async def disconnect():
    print("Disconnected from WebSocket!")

@sio.on("waiting-room")
async def on_waiting_room(data):
    print("Entered waiting room!", data)

@sio.on("room-joined")
async def on_room_joined(data):
    print("Entered MAIN room!", data)

async def main():
    try:
        await sio.connect(
            SOCKET_URL,
            auth={"token": token},
            transports=["websocket", "polling"]
        )
        await sio.wait()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
