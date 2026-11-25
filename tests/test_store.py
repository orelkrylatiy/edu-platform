from server.content import load_courses
from server.store import Store


def test_persistence(tmp_path):
    path = tmp_path / "test.sqlite3"
    store = Store(path)
    store.put("task", "a", True)
    store.put("note", "a", "hello")
    store.put("task", "a", False)
    assert Store(path).get("task", "a") is False
    assert Store(path).get("note", "a") == "hello"
    assert len(store.all()) == 2


def test_content():
    courses = load_courses()
    assert any(len(c["lessons"]) == 30 for c in courses)
