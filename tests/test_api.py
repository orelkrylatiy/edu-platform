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
        assert "Ask one question at a time" in messages[0]["content"]
        assert "Learning context" in messages[1]["content"]
        return "Question", provider
    monkeypatch.setattr(module, "generate", fake)
    client = TestClient(module.app)
    lesson = next(c for c in module.load_courses() if c["id"] == "system-analyst")["lessons"][0]
    response = client.post("/api/chat", auth=("learner", "test-password"), headers={"X-Workspace": "1"}, json={"lesson_id": lesson["id"], "text": "Start", "mode": "interviewer"})
    assert response.status_code == 200
    assert len(response.json()["messages"]) == 2


def test_invalid_state_and_chat_failure(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    client = TestClient(module.app)
    auth = ("learner", "test-password")
    headers = {"X-Workspace": "1"}
    for value in [1, "true", None]:
        assert client.put("/api/state/task/x", auth=auth, headers=headers, json={"value": value}).status_code == 422
    assert client.put("/api/state/session/x", auth=auth, headers=headers, json={"value": {"seconds": 5, "date": "2026-02-30"}}).status_code == 422
    lesson = next(c for c in module.load_courses() if c["id"] == "system-analyst")["lessons"][0]
    def fail(provider, messages):
        raise RuntimeError("secret must never be returned")
    monkeypatch.setattr(module, "generate", fail)
    result = client.post("/api/chat", auth=auth, headers=headers, json={"lesson_id": lesson["id"], "text": "Question"})
    assert result.status_code == 503
    assert "secret" not in result.text
    assert client.get("/api/state", auth=auth).json() == []


def test_practice_chat_is_contextual_and_persistent(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    practice = next(
        c["practice"][0] for c in module.load_courses() if c["id"] == "system-analyst"
    )
    task = practice["tasks"][0]
    captured = []

    def fake(provider, messages):
        captured.append(messages)
        assert practice["title"] in messages[1]["content"]
        assert task["text"][:60] in messages[1]["content"]
        return "Давай уточним требования.", "test-model"

    monkeypatch.setattr(module, "generate", fake)
    client = TestClient(module.app)
    auth = ("learner", "test-password")
    headers = {"X-Workspace": "1"}
    payload = {
        "lesson_id": practice["id"],
        "task_id": task["id"],
        "text": "Как начать?",
        "mode": "tutor",
    }
    result = client.post("/api/chat", auth=auth, headers=headers, json=payload)
    assert result.status_code == 200
    assert result.json()["provider"] == "test-model"
    assert len(result.json()["messages"]) == 2
    again = client.post(
        "/api/chat", auth=auth, headers=headers, json={**payload, "text": "А дальше?"}
    )
    assert again.status_code == 200
    assert len(again.json()["messages"]) == 4
    assert len(captured[1]) >= 5
    assert len(module.store.get("chat", task["id"] + ":tutor")) == 4
    bad = client.post(
        "/api/chat", auth=auth, headers=headers, json={**payload, "task_id": "unknown"}
    )
    assert bad.status_code == 404


def test_rubric_score_validated(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    client = TestClient(module.app)
    kw = {"auth": ("learner", "test-password"), "headers": {"X-Workspace": "1"}}
    assert client.put("/api/state/rubric/sa-rubric-01", **kw, json={"value": 2}).status_code == 200
    assert client.put("/api/state/rubric/sa-rubric-01", **kw, json={"value": 4}).status_code == 422


def test_document_chat_scoped_and_history_not_truncated(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    course = next(c for c in module.load_courses() if c["id"] == "system-analyst")
    lesson = course["lessons"][0]
    document = course["documents"][1]

    def generate(provider, messages):
        assert document["title"] in messages[1]["content"]
        assert "Order Management" in messages[1]["content"]
        return "Review", "fake"

    monkeypatch.setattr(module, "generate", generate)
    client = TestClient(module.app)
    kw = {"auth": ("learner", "test-password"), "headers": {"X-Workspace": "1"}}
    payload = {"lesson_id": lesson["id"], "document_id": document["id"], "text": "Explain"}
    response = client.post("/api/chat", **kw, json=payload)
    assert response.status_code == 200
    assert len(module.store.get("chat", document["id"] + ":tutor")) == 2
    assert client.post(
        "/api/chat", **kw, json={**payload, "document_id": "other-doc"}
    ).status_code == 404



def test_long_chat_history_is_retained(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    lesson = next(
        c["lessons"][0] for c in module.load_courses() if c["id"] == "system-analyst"
    )
    key = lesson["id"] + ":tutor"
    previous = [
        {"role": "assistant", "content": f"answer {index}", "id": str(index)}
        for index in range(44)
    ]
    module.store.put("chat", key, previous)
    monkeypatch.setattr(module, "generate", lambda *_: ("New answer", "mock"))
    client = TestClient(module.app)
    response = client.post(
        "/api/chat",
        auth=("learner", "test-password"),
        headers={"X-Workspace": "1"},
        json={"lesson_id": lesson["id"], "text": "Continue"},
    )
    assert response.status_code == 200
    assert len(module.store.get("chat", key)) == 46
    assert module.store.get("chat", key)[0]["content"] == "answer 0"



def test_chat_sessions_are_isolated_and_legacy_history_is_preserved(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKSPACE_PASSWORD", "test-password")
    monkeypatch.setattr(module, "store", Store(tmp_path / "db.sqlite"))
    captured = []

    def fake(provider, messages):
        captured.append(messages)
        return "Reply", provider

    monkeypatch.setattr(module, "generate", fake)
    client = TestClient(module.app)
    kw = {"auth": ("learner", "test-password"), "headers": {"X-Workspace": "1"}}
    lesson = next(c["lessons"][0] for c in module.load_courses() if c["id"] == "system-analyst")
    payload = {"lesson_id": lesson["id"], "mode": "reviewer"}
    first = "11111111-1111-4111-8111-111111111111"
    second = "22222222-2222-4222-8222-222222222222"
    for session, message, length in [
        (None, "Legacy message", 2),
        (first, "First message", 2),
        (second, "Second message", 2),
        (first, "Continue first", 4),
    ]:
        response = client.post(
            "/api/chat", **kw, json={**payload, "session_id": session, "text": message}
        )
        assert response.status_code == 200
        assert len(response.json()["messages"]) == length
    assert len(captured[1]) == len(captured[2]) == 3
    assert captured[3][2]["content"] == "First message"
    key = lesson["id"] + ":reviewer"
    assert len(module.store.get("chat", key)) == 2
    assert len(module.store.get("chat", key + ":" + first)) == 4
    assert len(module.store.get("chat", key + ":" + second)) == 2
    assert client.post(
        "/api/chat", **kw, json={**payload, "session_id": "invalid", "text": "No"}
    ).status_code == 422
