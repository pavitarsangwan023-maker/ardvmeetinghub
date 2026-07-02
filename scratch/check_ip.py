import requests
try:
    print(requests.get("https://ifconfig.me").text)
except:
    pass
