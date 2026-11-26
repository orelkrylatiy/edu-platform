"""Read the three unmodified SA Wiki documents into a versioned learning schema.

The Markdown in content/system-analyst/source is authoritative. Generated lesson and
practice items do not replace the originals: documents expose every source line.
Stable IDs are based on day/section and checkbox position; do not reorder old checkboxes
after learners have started without a migration.
"""
import re
from pathlib import Path

SOURCES = Path(__file__).resolve().parents[1] / "content/system-analyst/source"
ORIGINALS = {
    "sa-roadmap": ("roadmap.md", "Middle System Analyst Roadmap"),
    "sa-practice-lab": ("practice-lab.md", "SA Practice Lab"),
    "sa-scorecard": ("scorecard.md", "SA Interview Scorecard"),
}
WIKI_ROOT = "https://github.com/orelkrylatiy/personal-wiki/blob/main/01%20Projects/Career%20Offer/System%20Analyst/"
DAY = re.compile(r"^#{2,3} День (\d{2})\s*[—-]\s*(.+?)\s*$")
BLOCK = re.compile(r"^## Блок \d+\.\s*(.+?)\s*[—-]\s*дни\s+")
CHECKBOX = re.compile(r"^- \[[ xX]\] (.*)$")
HEADING = re.compile(r"^#{2,4}\s+(.+?)\s*$")


def strip_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[end + 5 :].lstrip("\n")
    return text


def is_optional(text: str) -> bool:
    return bool(re.search(r"\bопциональн|\bнеобязательн", text, flags=re.I))


def make_task(prefix: str, position: int, text: str, kind: str = "practice") -> dict:
    return {
        "id": f"{prefix}-task-{position:02d}",
        "text": text,
        "type": "gate" if re.search(r"\bGate\s+[1-6]\s*:", text) else kind,
        "optional": is_optional(text),
        "origin": "source",
    }


def parse_days(text: str) -> list[dict]:
    lessons = []
    active = None
    module = "Диагностика"
    introduction = []
    in_module = False

    def finish():
        if active is not None:
            active["body"] = "\n".join(active.pop("_body")).strip()
            lessons.append(active)

    for line in strip_frontmatter(text).splitlines():
        block = BLOCK.match(line)
        day = DAY.match(line)
        if block:
            finish()
            active = None
            module = block.group(1).strip()
            introduction = [line]
            in_module = True
        elif day:
            finish()
            number, title = day.groups()
            active = {
                "id": f"sa-{number}",
                "title": title,
                "module": module,
                "minutes": 180,
                "kind": "day",
                "day": int(number),
                "_body": [*introduction],
                "tasks": [],
            }
            introduction = []
            in_module = False
        elif line.startswith("## "):
            finish()
            active = None
            in_module = False
        elif active is not None:
            checkbox = CHECKBOX.match(line)
            if checkbox:
                active["tasks"].append(
                    make_task(active["id"], len(active["tasks"]) + 1, checkbox.group(1))
                )
            else:
                active["_body"].append(line)
        elif in_module:
            introduction.append(line)
    finish()

    if [lesson["day"] for lesson in lessons] != list(range(1, 31)):
        raise ValueError("SA roadmap must contain days 01..30 in order")
    if sum(len(lesson_item["tasks"]) for lesson_item in lessons) != 119:
        raise ValueError("SA roadmap checkbox count drifted; review import")
    return lessons


def parse_lab(text: str) -> list[dict]:
    practice = []
    section = None
    active = None
    group = None

    def finish():
        if active is not None:
            active["body"] = "\n".join(active.pop("_body")).strip()
            if not active["tasks"]:
                active["tasks"] = [{
                    "id": active["id"] + "-complete",
                    "text": "Завершить практику раздела и сохранить собственный результат",
                    "type": "practice",
                    "optional": False,
                    "origin": "derived",
                }]
            practice.append(active)

    for line in strip_frontmatter(text).splitlines():
        heading = HEADING.match(line)
        if heading and line.startswith("## "):
            finish()
            active = None
            section = heading.group(1)
            if section.startswith("Диагностика"):
                group = "diagnostic"
            elif section.startswith("Сквозной кейс"):
                group = "order-management"
            elif section.startswith("Незнакомые кейсы"):
                group = "transfer"
                active = {
                    "id": "sa-lab-transfer",
                    "title": section,
                    "module": "Practice Lab",
                    "kind": "practice",
                    "group": group,
                    "minutes": 90,
                    "_body": [],
                    "tasks": [],
                }
            elif section.startswith("Mock protocol"):
                group = "mock"
                active = {
                    "id": "sa-lab-mock-protocol",
                    "title": section,
                    "module": "Practice Lab",
                    "kind": "practice",
                    "group": group,
                    "minutes": 90,
                    "_body": [],
                    "tasks": [],
                }
            else:
                group = None
        elif heading and line.startswith("### "):
            title = heading.group(1)
            if group == "diagnostic" and not re.match(r"^[1-6]\.\s", title):
                finish()
                active = None
                continue
            if group in {"diagnostic", "order-management"}:
                finish()
                identifier = (
                    "sa-lab-diagnostic-" + title.split(".", 1)[0].zfill(2)
                    if group == "diagnostic"
                    else "sa-lab-case-" + title.split(".", 1)[0].lower()
                )
                active = {
                    "id": identifier,
                    "title": title,
                    "module": "Practice Lab",
                    "kind": "practice",
                    "group": group,
                    "minutes": 40 if group == "diagnostic" else 90,
                    "_body": [],
                    "tasks": [],
                }
        elif active is not None:
            checkbox = CHECKBOX.match(line)
            if checkbox:
                active["tasks"].append(
                    make_task(active["id"], len(active["tasks"]) + 1, checkbox.group(1))
                )
            else:
                active["_body"].append(line)
    finish()
    if sum(len([t for t in p["tasks"] if t["origin"] == "source"]) for p in practice) != 13:
        raise ValueError("SA Practice Lab checkbox count drifted")
    return practice


def parse_rubric(text: str) -> list[dict]:
    area = strip_frontmatter(text).split("## Рубрика комплексного кейса", 1)
    if len(area) != 2:
        raise ValueError("Missing scorecard rubric")
    lines = area[1].split("## ", 1)[0].splitlines()
    result = []
    for line in lines:
        if line.startswith("|") and line.count("|") >= 3:
            label = line.split("|")[1].strip()
            if not label or label == "Критерий" or set(label) <= set("-: "):
                continue
            result.append({"id": f"sa-rubric-{len(result)+1:02d}", "title": label, "max": 2})
    if len(result) != 8:
        raise ValueError("Scorecard rubric must have eight criteria")
    return result


def build_course() -> dict:
    raw = {
        key: (SOURCES / filename).read_text(encoding="utf-8")
        for key, (filename, _) in ORIGINALS.items()
    }
    documents = []
    for key, (filename, title) in ORIGINALS.items():
        documents.append({
            "id": key,
            "title": title,
            "body": strip_frontmatter(raw[key]),
            "source": WIKI_ROOT + title.replace(" ", "%20") + ".md",
            "read_only": True,
        })
    lessons = parse_days(raw["sa-roadmap"])
    practice = parse_lab(raw["sa-practice-lab"])
    rubric = parse_rubric(raw["sa-scorecard"])
    return {
        "id": "system-analyst",
        "title": "Middle System Analyst",
        "description": "30 учебных дней · оригинальный Roadmap, Practice Lab и Scorecard",
        "skills": [
            "Requirements", "API", "SQL", "Modeling", "Integration",
            "Architecture", "Communication",
        ],
        "content_version": 1,
        "provenance": "Wiki; AI-assisted draft, reviewed:false in source",
        "overview": strip_frontmatter(raw["sa-roadmap"]).split("## День 01", 1)[0].strip(),
        "lessons": lessons,
        "practice": practice,
        "rubric": rubric,
        "documents": documents,
        "source_stats": {
            "days": len(lessons),
            "roadmap_tasks": sum(len(lesson_item["tasks"]) for lesson_item in lessons),
            "lab_source_tasks": sum(
                sum(t["origin"] == "source" for t in p["tasks"]) for p in practice
            ),
            "rubric_items": len(rubric),
        },
    }
