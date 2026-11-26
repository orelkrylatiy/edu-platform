"""Safely compare and optionally update three SA course Markdown files."""
import argparse
import hashlib
from pathlib import Path

from server.course_import import ORIGINALS, SOURCES, parse_days, parse_lab, parse_rubric

WIKI_FOLDER = Path("01 Projects/Career Offer/System Analyst")


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def sync(vault: Path, apply: bool) -> int:
    staged = {}
    for key, (filename, _) in ORIGINALS.items():
        original = vault / WIKI_FOLDER / {
            "sa-roadmap": "Middle System Analyst Roadmap.md",
            "sa-practice-lab": "SA Practice Lab.md",
            "sa-scorecard": "SA Interview Scorecard.md",
        }[key]
        text = original.read_text(encoding="utf-8")
        target = SOURCES / filename
        before = target.read_text(encoding="utf-8")
        changed = before != text
        print(f"{filename}: {'CHANGED' if changed else 'unchanged'} "
              f"({digest(before)} -> {digest(text)})")
        staged[key] = (target, text)
    parse_days(staged["sa-roadmap"][1])
    parse_lab(staged["sa-practice-lab"][1])
    parse_rubric(staged["sa-scorecard"][1])
    if apply:
        print("WARNING: the destination is PUBLIC version-controlled course material.")
        for target, text in staged.values():
            target.write_text(text, encoding="utf-8")
        print("Updated three local sources. Review git diff before publishing.")
    else:
        print("Dry run: no file changed. Use --apply after inspecting source privacy.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("vault", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    raise SystemExit(sync(args.vault, args.apply))
