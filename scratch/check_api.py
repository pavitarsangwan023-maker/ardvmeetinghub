import requests
try:
    r = requests.get("https://api.ardvmeetinghub.com/api/health")
    print("Health:", r.status_code, r.text)
except Exception as e:
    print("Error:", e)
