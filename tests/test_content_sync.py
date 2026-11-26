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
    monkeypatch.setenv("WORKSPACE_USER", "learner")
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

    member = module.store.create_user("testmember", "long-test-password-123")
    token, _ = module.store.new_session(member["id"], True)
    client.cookies.clear()
    client.cookies.set(module.COOKIE, token)
    assert client.get("/api/content/status").status_code == 403
    assert client.post("/api/content/sync", headers=headers).status_code == 403


def test_github_snapshot_fetch_and_sha_shortcut(monkeypatch):
    import base64
    import json

    import httpx

    from server import content_sync as module

    monkeypatch.setenv("CONTENT_REPOSITORY", "owner/content")
    monkeypatch.setenv("CONTENT_BRANCH", "content")
    monkeypatch.delenv("CONTENT_GITHUB_TOKEN", raising=False)
    course = {
        "id": "sample",
        "title": "Sample",
        "skills": [],
        "lessons": [
            {
                "id": "sample-01",
                "title": "First lesson",
                "tasks": [{"id": "sample-task", "text": "Try it", "optional": False}],
            }
        ],
    }
    raw = json.dumps(course).encode()
    calls = []

    def handle(request):
        path = request.url.path
        calls.append(path)
        assert request.url.host == "api.github.com"
        if path.endswith("/git/ref/heads/content"):
            data = {"object": {"sha": "a" * 40}}
        elif path.endswith("/git/trees/" + "a" * 40):
            data = {"tree": [
                {"path": "content/courses/sample.json", "type": "blob",
                 "sha": "b" * 40, "size": len(raw)}
            ]}
        elif path.endswith("/git/blobs/" + "b" * 40):
            data = {"encoding": "base64", "content": base64.b64encode(raw).decode()}
        else:
            return httpx.Response(404)
        return httpx.Response(200, json=data)

    client = httpx.Client
    monkeypatch.setattr(
        module.httpx, "Client",
        lambda **kw: client(transport=httpx.MockTransport(handle), **kw),
    )
    sync = ContentSync()
    version, courses = sync._fetch({})
    assert version == "a" * 40
    assert courses == [course]
    assert len(calls) == 3
    assert sync._fetch({"version": version, "courses": courses}) == (version, courses)
    assert len(calls) == 4
