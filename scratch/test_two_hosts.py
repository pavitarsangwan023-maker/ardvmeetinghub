import asyncio
import socketio
import requests

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"
MEETING_ID = "6C92-14CE-3AE4"

async def main():
    print("Logging in as Host 1...")
    res = requests.post(f"{API_URL}/auth/login", json={"email": "sisskapil@gmail.com", "password": "12345678"})
    token = res.json()["access_token"]
    
    sio1 = socketio.AsyncClient(logger=False, engineio_logger=False)

    @sio1.event
    async def connect():
        print(f"[Host 1] Connected! SID: {sio1.get_sid()}")
        await sio1.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })

    @sio1.on("participant-list")
    async def on_part_list(data):
        print(f"[Host 1] Participant List: {[p['name'] for p in data['participants']]}")

    await sio1.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    await asyncio.sleep(2)
    
    print("Logging in as Host 2 (same account)...")
    sio2 = socketio.AsyncClient(logger=False, engineio_logger=False)
    
    @sio2.event
    async def connect():
        print(f"[Host 2] Connected! SID: {sio2.get_sid()}")
        await sio2.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })
        
    await sio2.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    await asyncio.sleep(5)
    
    await sio1.disconnect()
    await sio2.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
