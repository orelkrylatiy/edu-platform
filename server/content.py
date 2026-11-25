import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_courses():
    courses = []
    ids = set()
    public = {p.name: p for p in (ROOT / "content/courses").glob("*.json")}
    private = {p.name: p for p in (ROOT / "content/private").glob("*.json")}
    for path in sorted((public | private).values()):
        course = json.loads(path.read_text(encoding="utf-8"))
        if not course["lessons"] or not course["title"] or not isinstance(course["skills"], list):
            raise ValueError("Invalid course")
        for item in [course, *course["lessons"]]:
            key = item["id"]
            if key in ids:
                raise ValueError(f"Duplicate content id: {key}")
            ids.add(key)
        for lesson in course["lessons"]:
            if not lesson["tasks"] or not lesson["title"]:
                raise ValueError("Empty lesson")
            for task in lesson["tasks"]:
                if task["id"] in ids:
                    raise ValueError("Duplicate task id")
                ids.add(task["id"])
        courses.append(course)
    return courses
