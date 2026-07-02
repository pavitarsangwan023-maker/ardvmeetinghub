import requests

res = requests.post("https://api.ardvmeetinghub.com/api/auth/login", json={"email":"sisskapil@gmail.com","password":"12345678"})
token = res.json()["access_token"]
m = requests.get("https://api.ardvmeetinghub.com/api/meetings/5441-1C19-09F3", headers={"Authorization": f"Bearer {token}"}).json()
print(m)
