from server.content import load_courses
from server.content_sync import ContentSync


def test_lazy_refresh_and_last_good(monkeypatch, tmp_path):
    monkeypatch.setenv("CONTENT_REPOSITORY", "owner/content")
    monkeypatch.setenv("WORKSPACE_DB", str(tmp_path / "workspace.sqlite3"))
    sync = ContentSync()
    bundled = load_courses(public_only=True)
    calls = []

    def fetch(current):
        calls.append(current)
        return "a" * 40, bundled

    monkeypatch.setattr(sync, "_fetch", fetch)
    assert sync.refresh()["status"] == "success"
    assert sync.refresh()["version"] == "a" * 40
    assert len(calls) == 1
    assert ContentSync().refresh()["version"] == "a" * 40
    assert len(calls) == 1

    def fail(current):
        raise RuntimeError("offline")

    monkeypatch.setattr(sync, "_fetch", fail)
    assert sync.refresh(force=True)["status"] == "error"
    assert sync.courses(public_only=True) == bundled
    assert ContentSync().status()["version"] == "a" * 40


def test_reject_removed_ids(monkeypatch, tmp_path):
    monkeypatch.setenv("CONTENT_REPOSITORY", "owner/content")
    monkeypatch.setenv("WORKSPACE_DB", str(tmp_path / "workspace.sqlite3"))
    sync = ContentSync()
    bundled = load_courses(public_only=True)
    monkeypatch.setattr(sync, "_fetch", lambda current: ("b" * 40, bundled[1:]))
    assert sync.refresh(force=True)["status"] == "error"
    assert sync.courses(public_only=True) == bundled


def test_sync_owner_only(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient

    from server import app as module
    from server.store import Store

    monkeypatch.delenv("CONTENT_REPOSITORY", raising=False)
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    client = TestClient(module.app)
    headers = {"X-Workspace": "1"}
    assert client.post("/api/content/sync", headers=headers).status_code == 401
    result = client.post(
        "/api/content/sync", auth=("learner", "test-password"), headers=headers
    )
    assert result.status_code == 200
    assert result.json()["status"] == "disabled"
