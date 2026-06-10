import urllib.request
import urllib.parse
import json

KEYCLOAK_URLS = ["http://localhost:8443", "http://localhost:8080", "http://keycloak:8080"]
ADMIN_USER = "admin"
# Try both common passwords
PASSWORDS = ["KeycloakAdmin@2024#", "admin"]

def get_token(base_url, password):
    url = f"{base_url}/realms/master/protocol/openid-connect/token"
    data = urllib.parse.urlencode({
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": ADMIN_USER,
        "password": password
    }).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode())
            return res.get("access_token")
    except Exception as e:
        # print(f"Failed to get token from {url} with pass {password}: {e}")
        return None

def list_users(base_url, token):
    url = f"{base_url}/admin/realms/microlinks/users"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            users = json.loads(response.read().decode())
            return users
    except Exception as e:
        print(f"Failed to list users from {url}: {e}")
        return None

for url in KEYCLOAK_URLS:
    for pwd in PASSWORDS:
        token = get_token(url, pwd)
        if token:
            print(f"Success connecting to {url} with password {pwd}")
            users = list_users(url, token)
            if users is not None:
                print(f"Found {len(users)} users:")
                for u in users:
                    print(f"  - Username: {u.get('username')}, Email: {u.get('email')}, Enabled: {u.get('enabled')}, Attributes: {u.get('attributes')}")
            else:
                print("Could not list users.")
            break
