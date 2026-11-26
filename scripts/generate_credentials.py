"""Generate owner credentials and an optional invite code. Nothing is stored or committed."""
import secrets
import string

ALPHABET = string.ascii_letters + string.digits + "-_"


def generate_credentials():
    username = "owner_" + secrets.token_hex(4)
    password = "".join(secrets.choice(ALPHABET) for _ in range(36))
    invite = secrets.token_urlsafe(24)
    return username, password, invite


if __name__ == "__main__":
    user, password, invite = generate_credentials()
    print("Copy these values into your VPS .env, not into Git:")
    print(f"WORKSPACE_USER={user}")
    print(f"WORKSPACE_PASSWORD={password}")
    print("WORKSPACE_ALLOW_REGISTRATION=1")
    print(f"WORKSPACE_INVITE_CODE={invite}")
    print("WORKSPACE_COOKIE_SECURE=1")
    print("Restart the server only after backing up the existing SQLite database.")
