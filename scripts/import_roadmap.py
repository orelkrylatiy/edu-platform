"""Local-only import of the explicitly selected educational roadmap."""
import argparse
import json
import re
from pathlib import Path


def convert(text):
    lessons = []
    module = "Start"
    current = None
    for line in text.splitlines():
        block = re.match(r"^## Блок \d+\. (.+?) — дни", line)
        if block:
            module = block.group(1)
            current = None
        day = re.match(r"^#{2,3} День (\d+) — (.+)$", line)
        if day:
            key = f"sa-import-{int(day.group(1)):02d}"
            current = {
                "id": key, "title": day.group(2), "module": module, "minutes": 180,
                "body": "", "tasks": [],
            }
            lessons.append(current)
        elif current and re.match(r"^- \[[ xX]\] ", line):
            task = line[6:]
            task_type = "gate" if re.match(r"Gate [1-6]:", task) else "practice"
            current["tasks"].append({
                "id": f"{current['id']}-task-{len(current['tasks']) + 1}",
                "text": task, "type": task_type, "optional": task.startswith("Опционально"),
            })
        elif current and line.startswith("## "):
            current = None
        elif current:
            current["body"] += line + "\n"
    if len(lessons) != 30 or any(not lesson["tasks"] for lesson in lessons):
        raise ValueError("Expected 30 nonempty roadmap days; inspect source format")
    return {
        "id": "system-analyst", "title": "System Analyst",
        "description": "Local imported 30-day roadmap",
        "skills": ["Requirements", "API", "SQL", "Modeling", "Integration", "Architecture", "Communication"],
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / "content/private/system-analyst.json"
    if target.exists() and not args.overwrite:
        raise SystemExit("Private course already exists; edit in place to preserve IDs")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(convert(args.source.read_text(encoding="utf-8")), ensure_ascii=False, indent=2), encoding="utf-8")
    print("Saved local ignored course:", target)
