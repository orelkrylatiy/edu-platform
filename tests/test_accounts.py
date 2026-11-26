import sqlite3
import time

from fastapi.testclient import TestClient
import pytest

from server import app as module
from server.store import Store


@pytest.fixture
def fresh(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_USER", "owner")
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-owner-password-123")
    monkeypatch.setenv("WORKSPACE_ALLOW_REGISTRATION", "1")
    monkeypatch.setenv("WORKSPACE_INVITE_CODE", "only-for-invitees")
    monkeypatch.setenv("WORKSPACE_COOKIE_SECURE", "0")
    monkeypatch.setenv("WORKSPACE_AI_DAILY_LIMIT", "3")
    db = tmp_path / "accounts.sqlite"
    monkeypatch.setattr(module, "store", Store(db))
    return db


def send(client, endpoint, data):
    return client.post(endpoint, headers={"X-Workspace": "1"}, json=data)


def test_guest_catalog_and_registration_gate(fresh, monkeypatch):
    client = TestClient(module.app)
    catalog = client.get("/api/catalog")
    assert catalog.status_code == 200
    assert all("documents" not in course and "tasks" not in course for course in catalog.json())
    assert client.get("/api/content").status_code == 401
    assert client.get("/api/state").status_code == 401
    blocked = send(client, "/api/auth/register", {
        "username": "student_a", "password": "very-strong-password", "invite_code": "wrong",
    })
    assert blocked.status_code == 403
    monkeypatch.setenv("WORKSPACE_ALLOW_REGISTRATION", "0")
    assert send(client, "/api/auth/register", {
        "username": "student_a", "password": "very-strong-password", "invite_code": "only-for-invitees",
    }).status_code == 403
    monkeypatch.setenv("WORKSPACE_ALLOW_REGISTRATION", "1")
    assert send(client, "/api/auth/register", {
        "username": "bad!", "password": "very-strong-password", "invite_code": "only-for-invitees",
    }).status_code == 422


def test_accounts_isolate_records_sessions_and_enrollments(fresh):
    owner = TestClient(module.app)
    other = TestClient(module.app)
    owner_login = send(owner, "/api/auth/login", {
        "username": "owner", "password": "test-owner-password-123", "remember": True,
    })
    assert owner_login.status_code == 200
    assert "HttpOnly" in owner_login.headers["set-cookie"]
    assert "SameSite=lax" in owner_login.headers["set-cookie"]
    assert "Max-Age=2592000" in owner_login.headers["set-cookie"]
    owner_id = owner_login.json()["user"]["id"]
    assert owner_login.json()["enrollments"] == ["system-analyst"]
    created = send(other, "/api/auth/register", {
        "username": "student_b", "password": "another-very-strong-password",
        "invite_code": "only-for-invitees", "remember": True,
    })
    assert created.status_code == 201
    member_id = created.json()["user"]["id"]
    assert member_id != owner_id
    assert created.json()["enrollments"] == []
    assert other.get("/api/auth/me").json()["user"]["username"] == "student_b"
    assert other.get("/api/content").status_code == 200
    assert send(owner, "/api/auth/register", {
        "username": "STUDENT_B", "password": "another-very-strong-password",
        "invite_code": "only-for-invitees",
    }).status_code == 409
    state_key = "/api/state/note/sa-01"
    assert owner.put(state_key, headers={"X-Workspace": "1"}, json={"value": "OWNER PRIVATE"}).status_code == 200
    assert other.put(state_key, headers={"X-Workspace": "1"}, json={"value": "MEMBER PRIVATE"}).status_code == 200
    assert owner.get("/api/state").json()[0]["value"] == "OWNER PRIVATE"
    assert other.get("/api/state").json()[0]["value"] == "MEMBER PRIVATE"
    assert send(other, "/api/enrollments/system-analyst", {}).status_code == 200
    assert "system-analyst" in other.get("/api/enrollments").json()
    assert send(other, "/api/enrollments/system-analyst", {}).status_code == 200
    assert other.get("/api/enrollments").json().count("system-analyst") == 1
    # Session cookies are opaque and only their SHA256 hashes are persisted.
    with sqlite3.connect(fresh) as db:
        assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] >= 2
        assert db.execute("SELECT COUNT(*) FROM user_records").fetchone()[0] == 2
        hashes = [row[0] for row in db.execute("SELECT password_hash FROM users")]
        assert all("password" not in value for value in hashes)
        assert all(value.startswith("$argon2id$") for value in hashes)
    logout = send(other, "/api/auth/logout", {})
    assert logout.status_code == 200
    assert other.get("/api/state").status_code == 401
    assert owner.get("/api/state").status_code == 200
    # Cookie lifetime is stored in SQLite and survives process restarts.
    persisted_store = Store(fresh)
    assert persisted_store.user(owner_id)["username"] == "owner"
    assert persisted_store.get("note", "sa-01", user_id=member_id) == "MEMBER PRIVATE"


def test_legacy_data_migrates_once_without_destructive_schema(fresh, monkeypatch):
    dbpath = fresh.parent / "legacy.sqlite"
    with sqlite3.connect(dbpath) as db:
        db.execute(
            "CREATE TABLE records(kind TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,"
            "PRIMARY KEY(kind,id))"
        )
        db.execute(
            "INSERT INTO records(kind,id,value) VALUES('note','sa-01','\"legacy note\"')"
        )
        db.execute(
            "INSERT INTO records(kind,id,value) VALUES('session','session-1',"
            "'{\"seconds\":1500,\"date\":\"2026-11-21\"}')"
        )
    store = Store(dbpath)
    owner = store.owner()
    assert store.get("note", "sa-01", user_id=owner["id"]) == "legacy note"
    assert store.get("session", "session-1", user_id=owner["id"])["seconds"] == 1500
    with sqlite3.connect(dbpath) as db:
        assert db.execute("SELECT COUNT(*) FROM records").fetchone()[0] == 2
    # Reopen the same DB after restarting; do not overwrite newer user state.
    store.put("note", "sa-01", "new note", user_id=owner["id"])
    reopened = Store(dbpath)
    assert reopened.owner()["id"] == owner["id"]
    assert reopened.get("note", "sa-01", user_id=owner["id"]) == "new note"
    with sqlite3.connect(dbpath) as db:
        assert db.execute("SELECT COUNT(*) FROM records").fetchone()[0] == 2


def test_session_expiry_header_protection_and_login_limit(fresh):
    client = TestClient(module.app)
    bad = send(client, "/api/auth/login", {
        "username": "owner", "password": "incorrect",
    })
    assert bad.status_code == 401
    for _ in range(7):
        send(client, "/api/auth/login", {"username": "owner", "password": "incorrect"})
    assert send(client, "/api/auth/login", {
        "username": "owner", "password": "test-owner-password-123",
    }).status_code == 429
    client = TestClient(module.app)
    send(client, "/api/auth/register", {
        "username": "fresh_account", "password": "a-long-password-here",
        "invite_code": "only-for-invitees",
    })
    assert client.put("/api/state/note/sa-01", json={"value": "no-header"}).status_code == 403
    assert client.put(
        "/api/state/note/sa-01",
        headers={"X-Workspace": "1", "Origin": "https://evil.example"},
        json={"value": "wrong-origin"},
    ).status_code == 403
    with sqlite3.connect(fresh) as db:
        db.execute("UPDATE sessions SET expires_at=?",
                   (int(time.time()) - 1,))
    assert client.get("/api/state").status_code == 401


def test_chat_is_user_scoped_and_requires_enrollment(fresh, monkeypatch):
    a, b = TestClient(module.app), TestClient(module.app)
    for client, username in [(a, "student_01"), (b, "student_02")]:
        assert send(client, "/api/auth/register", {
            "username": username, "password": "long-password-for-account",
            "invite_code": "only-for-invitees",
        }).status_code == 201
    first_course = next(c for c in module.load_courses() if c["id"] == "system-analyst")
    lesson_id = first_course["lessons"][0]["id"]
    query = {"lesson_id": lesson_id, "text": "My private question"}
    assert send(a, "/api/chat", query).status_code == 403
    send(a, "/api/enrollments/system-analyst", {})
    send(b, "/api/enrollments/system-analyst", {})
    seen = []

    def fake(_, messages):
        seen.append(messages[1]["content"])
        return "Tutor response", "mock"

    monkeypatch.setattr(module, "generate", fake)
    assert send(a, "/api/chat", query).status_code == 200
    assert send(b, "/api/chat", {**query, "text": "Something else"}).status_code == 200
    assert "My private question" not in seen[1]
    assert len([row for row in a.get("/api/state").json() if row["kind"] == "chat"]) == 1
    assert len([row for row in b.get("/api/state").json() if row["kind"] == "chat"]) == 1
    for _ in range(2):
        assert send(a, "/api/chat", query).status_code == 200
    assert send(a, "/api/chat", query).status_code == 429


def test_public_content_never_reads_private_override(monkeypatch, tmp_path):
    from server import content
    import json
    root = tmp_path
    (root / "content/courses").mkdir(parents=True)
    (root / "content/private").mkdir()
    sample = {
        "id": "safe", "title": "Public", "skills": ["SQL"],
        "lessons": [{"id": "safe-01", "title": "Basics", "module": "SQL",
                     "minutes": 20, "body": "Public",
                     "tasks": [{"id": "safe-01-1", "text": "Explain it",
                                "optional": False, "type": "practice"}]}],
    }
    (root / "content/courses/safe.json").write_text(json.dumps(sample))
    sample["title"] = "PRIVATE SECRET"
    (root / "content/private/safe.json").write_text(json.dumps(sample))
    monkeypatch.setattr(content, "ROOT", root)
    assert content.load_courses(public_only=True)[0]["title"] == "Public"
    assert content.load_courses(public_only=False)[0]["title"] == "PRIVATE SECRET"


def test_legacy_basic_browser_upgrades_to_cookie_and_logout_blocks_reauth(fresh):
    client = TestClient(module.app)
    me = client.get("/api/auth/me", auth=("owner", "test-owner-password-123"))
    assert me.status_code == 200
    assert me.json()["user"]["is_owner"]
    assert "lw_session=" in me.headers["set-cookie"]
    assert client.get("/api/state").status_code == 200
    assert send(client, "/api/auth/logout", {}).status_code == 200
    # A browser may retain the old Authorization: Basic header, but explicit
    # sign-out must not silently restore its legacy session.
    denied = client.get("/api/auth/me", auth=("owner", "test-owner-password-123"))
    assert denied.json()["user"] is None


def test_local_vite_origin_allowed_only_in_development(fresh, monkeypatch):
    client = TestClient(module.app)
    result = send(client, "/api/auth/login", {
        "username": "owner", "password": "test-owner-password-123",
    })
    assert result.status_code == 200
    headers = {
        "X-Workspace": "1",
        "Host": "127.0.0.1:8000",
        "Origin": "http://127.0.0.1:5173",
    }
    assert client.put(
        "/api/state/note/sa-01", headers=headers,
        json={"value": "vite-dev-note"},
    ).status_code == 200
    monkeypatch.setenv("WORKSPACE_COOKIE_SECURE", "1")
    assert client.put(
        "/api/state/note/sa-01", headers=headers,
        json={"value": "should-not-write"},
    ).status_code == 403


def test_chat_lock_is_per_account_not_global(fresh, monkeypatch):
    clients = [TestClient(module.app), TestClient(module.app)]
    for index, client in enumerate(clients):
        assert send(client, "/api/auth/register", {
            "username": f"parallel_{index}", "password": "a-strong-password-longer",
            "invite_code": "only-for-invitees",
        }).status_code == 201
        assert send(client, "/api/enrollments/system-analyst", {}).status_code == 200
    ids = [client.get("/api/auth/me").json()["user"]["id"] for client in clients]
    module.chat_locks[ids[0]].acquire()
    lesson_id = next(c for c in module.load_courses() if c["id"] == "system-analyst")["lessons"][0]["id"]
    monkeypatch.setattr(module, "generate", lambda *_: ("Answer", "test"))
    try:
        assert send(clients[0], "/api/chat", {"lesson_id": lesson_id, "text": "A"}).status_code == 409
        assert send(clients[1], "/api/chat", {"lesson_id": lesson_id, "text": "B"}).status_code == 200
    finally:
        module.chat_locks[ids[0]].release()
    # The rejected request did not consume account A's daily AI budget.
    for _ in range(3):
        assert send(clients[0], "/api/chat", {"lesson_id": lesson_id, "text": "A"}).status_code == 200
    assert send(clients[0], "/api/chat", {"lesson_id": lesson_id, "text": "A"}).status_code == 429
