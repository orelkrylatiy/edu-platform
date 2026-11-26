from server.course_import import SOURCES, ORIGINALS, build_course
from server.content import load_courses


def test_complete_course_import():
    course = build_course()
    assert len(course["lessons"]) == 30
    assert [lesson_item["id"] for lesson_item in course["lessons"]] == [
        f"sa-{day:02d}" for day in range(1, 31)
    ]
    assert sum(len(lesson_item["tasks"]) for lesson_item in course["lessons"]) == 119
    assert sum(
        t["origin"] == "source"
        for activity in course["practice"]
        for t in activity["tasks"]
    ) == 13
    assert len(course["rubric"]) == 8
    assert len(course["documents"]) == 3
    all_docs = "\n".join(d["body"] for d in course["documents"])
    for name, (filename, _) in ORIGINALS.items():
        assert (SOURCES / filename).read_text(encoding="utf-8").strip().endswith(
            next(d["body"] for d in course["documents"] if d["id"] == name).splitlines()[-1]
        )
    assert all_docs.count("https://") >= 70
    assert "[[SA Practice Lab" in all_docs
    assert "[[SA Interview Scorecard" in all_docs


def test_catalog_replaces_demo_skeleton_with_real_source():
    course = next(c for c in load_courses() if c["id"] == "system-analyst")
    assert course["lessons"][0]["id"] == "sa-01"
    assert course["lessons"][0]["tasks"][0]["text"].startswith("Прочитать [гайд Сбера]")
    assert course["documents"][1]["id"] == "sa-practice-lab"
    assert any(a["group"] == "order-management" for a in course["practice"])


def test_no_duplicate_task_ids():
    course = build_course()
    ids = [t["id"] for item in [*course["lessons"], *course["practice"]] for t in item["tasks"]]
    assert len(ids) == len(set(ids))
