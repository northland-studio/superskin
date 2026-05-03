import urllib.request
import json

data = json.dumps({
    "username": "testuser123",
    "email": "testuser123@test.com",
    "password": "123456"
}).encode()

req = urllib.request.Request(
    "http://localhost:3004/api/auth/register",
    data=data,
    headers={"Content-Type": "application/json"}
)

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode())
