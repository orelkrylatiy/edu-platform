"""Course catalog and source validation for the public and private learning packs."""
import json
from pathlib import Path

from .course_import import SOURCES, build_course

ROOT = Path(__file__).resolve().parents[1]


def validate_course(course: dict, seen: set[str]) -> None:
    required = {"id", "title", "skills", "lessons"}
    if not required.issubset(course) or not course["title"] or not isinstance(course["skills"], list):
        raise ValueError("Invalid course manifest")
    if not isinstance(course["lessons"], list) or not course["lessons"]:
        raise ValueError("Course needs lessons")
    activities = [*course["lessons"], *course.get("practice", [])]
    documents = course.get("documents", [])
    for item in [course, *activities, *documents]:
        if not item.get("id") or item["id"] in seen:
            raise ValueError("Missing or duplicate id " + str(item.get("id")))
        seen.add(item["id"])
    for activity in activities:
        if not activity.get("title") or not activity.get("tasks"):
            raise ValueError("Empty activity " + activity.get("id", "<unknown>"))
        for task in activity["tasks"]:
            if not task.get("id") or task["id"] in seen or not task.get("text"):
                raise ValueError("Invalid or duplicated task " + str(task.get("id")))
            if not isinstance(task.get("optional"), bool):
                raise ValueError("Task optional must be boolean")
            seen.add(task["id"])
    for criterion in course.get("rubric", []):
        if not criterion.get("id") or criterion["id"] in seen or criterion.get("max") != 2:
            raise ValueError("Invalid or duplicated rubric criterion")
        seen.add(criterion["id"])
    for doc in documents:
        if not isinstance(doc.get("body"), str):
            raise ValueError("Document requires Markdown body")


def load_courses(
    public_only: bool = False,
    *,
    public_root: Path | None = None,
    public_courses: list[dict] | None = None,
) -> list[dict]:
    root = public_root if public_root is not None else ROOT
    sources = root / "content/system-analyst/source" if public_root is not None else SOURCES
    if public_courses is None:
        public = {}
        for path in sorted((root / "content/courses").glob("*.json")):
            if path.name == "system-analyst.json" and (sources / "roadmap.md").exists():
                course = build_course(sources)
            else:
                course = json.loads(path.read_text(encoding="utf-8"))
            public[path.name] = course
    else:
        public = {course["id"] + ".json": course for course in public_courses}
    if not public_only:
        for path in sorted((ROOT / "content/private").glob("*.json")):
            public[path.name] = json.loads(path.read_text(encoding="utf-8"))
    seen = set()
    courses = []
    for _, course in sorted(public.items()):
        validate_course(course, seen)
        courses.append(course)
    return courses
