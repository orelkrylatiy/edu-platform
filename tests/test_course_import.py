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
    assert len(course["practice"]) == 14


def test_no_duplicate_task_ids():
    course = build_course()
    ids = [t["id"] for item in [*course["lessons"], *course["practice"]] for t in item["tasks"]]
    assert len(ids) == len(set(ids))



def test_all_wiki_document_links_are_supported():
    import re

    course = build_course()
    links = set()
    for doc in course["documents"]:
        links.update(re.findall(r"\[\[([^]#]+)", doc["body"]))
    assert links <= {
        "Middle System Analyst Roadmap",
        "SA Practice Lab",
        "SA Interview Scorecard",
        "Interview Preparation Plan",
    }


def test_raw_sources_keep_original_counts_and_urls():
    import re

    course = build_course()
    roadmap = course["documents"][0]["body"]
    lab = course["documents"][1]["body"]
    assert len(re.findall(r"https?://[^\s)]+", roadmap)) == 76
    assert len(re.findall(r"(?m)^- \[ \] ", roadmap)) == 119
    assert len(re.findall(r"(?m)^- \[ \] ", lab)) == 13
