import asyncio
import socketio
import requests

API_URL = "https://api.ardvmeetinghub.com/api"
SOCKET_URL = "https://api.ardvmeetinghub.com"
MEETING_ID = "6C92-14CE-3AE4"

async def main():
    print("Logging in as Host...")
    res = requests.post(f"{API_URL}/auth/login", json={"email": "sisskapil@gmail.com", "password": "12345678"})
    token = res.json()["access_token"]
    
    sio = socketio.AsyncClient(logger=False, engineio_logger=False)

    @sio.event
    async def connect():
        print(f"[Host] Connected! SID: {sio.get_sid()}")
        await sio.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })

    @sio.on("waiting-list")
    async def on_waiting_list(data):
        print(f"[Host] Received waiting-list: {data['participants']}")

    await sio.connect(SOCKET_URL, auth={"token": token}, transports=["websocket", "polling"])
    
    # After Host connects, connect a Guest
    await asyncio.sleep(2)
    
    print("Logging in as Guest...")
    guest_res = requests.post(f"{API_URL}/auth/guest", json={"name": "TestAI_Guest"})
    guest_token = guest_res.json()["access_token"]
    guest_sio = socketio.AsyncClient(logger=False, engineio_logger=False)
    
    @guest_sio.event
    async def connect():
        print(f"[Guest] Connected! SID: {guest_sio.get_sid()}")
        await guest_sio.emit("join-room", {
            "meetingId": MEETING_ID,
            "micEnabled": False,
            "cameraEnabled": False
        })
        
    await guest_sio.connect(SOCKET_URL, auth={"token": guest_token}, transports=["websocket", "polling"])
    
    # Wait to see if Host receives waiting list
    await asyncio.sleep(5)
    
    await sio.disconnect()
    await guest_sio.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
