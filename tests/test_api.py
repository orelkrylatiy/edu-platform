from fastapi.testclient import TestClient

from server import app as module
from server.store import Store


def test_auth_and_state(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    client = TestClient(module.app)
    auth = ("learner", "test-password")
    assert client.get("/api/state").status_code == 401
    assert client.put("/api/state/task/x", auth=auth, json={"value": True}).status_code == 403
    headers = {"X-Workspace": "1"}
    assert client.put("/api/state/task/x", auth=auth, headers=headers, json={"value": True}).status_code == 200
    assert client.get("/api/state", auth=auth).json()[0]["value"] is True
    assert client.put("/api/state/skill/x", auth=auth, headers=headers, json={"value": 5}).status_code == 422


def test_chat_context(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    def fake(provider, messages):
        assert "interviewer" not in messages[0]["content"] or messages
        assert "Learning context" in messages[1]["content"]
        return "Question", provider
    monkeypatch.setattr(module, "generate", fake)
    client = TestClient(module.app)
    lesson = module.load_courses()[0]["lessons"][0]
    response = client.post("/api/chat", auth=("learner", "test-password"), headers={"X-Workspace": "1"}, json={"lesson_id": lesson["id"], "text": "Start", "mode": "interviewer"})
    assert response.status_code == 200
    assert len(response.json()["messages"]) == 2
