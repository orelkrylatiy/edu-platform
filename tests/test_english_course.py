from server.content import load_courses


def test_english_course_manifest():
    courses = load_courses(public_only=True)
    course = next(c for c in courses if c["id"] == "english-speaking")
    lessons = course["lessons"]
    assert [lesson["id"] for lesson in lessons] == [
        f"en-{day:02d}" for day in range(1, 57)
    ]
    assert len({lesson["module"] for lesson in lessons}) == 8
    assert [lesson["minutes"] for lesson in lessons] == [
        30 if day % 7 == 0 else 55 for day in range(1, 57)
    ]
    assert all(
        any(task["id"] == lesson["id"] + "-speaking" for task in lesson["tasks"])
        for lesson in lessons
    )
    assert sum(len(lesson["tasks"]) for lesson in lessons) == 272
    assert len(course["practice"]) == 4
    assert len(course["documents"]) == 3
    assert sum(item["max"] for item in course["rubric"]) == 10
    assert course["reviewed"] is False
    assert "text-only" in lessons[0]["body"]
