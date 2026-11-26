from scripts.sync_system_analyst import sync
from server.course_import import ORIGINALS, SOURCES


def test_sync_dry_run_preserves_sources(tmp_path):
    source_dir = tmp_path / "01 Projects/Career Offer/System Analyst"
    source_dir.mkdir(parents=True)
    mappings = {
        "sa-roadmap": "Middle System Analyst Roadmap.md",
        "sa-practice-lab": "SA Practice Lab.md",
        "sa-scorecard": "SA Interview Scorecard.md",
    }
    for key, (filename, _) in ORIGINALS.items():
        (source_dir / mappings[key]).write_text(
            (SOURCES / filename).read_text(encoding="utf-8"), encoding="utf-8"
        )
    before = {
        filename: (SOURCES / filename).read_text(encoding="utf-8")
        for filename, _ in ORIGINALS.values()
    }
    assert sync(tmp_path, False) == 0
    assert before == {
        filename: (SOURCES / filename).read_text(encoding="utf-8")
        for filename, _ in ORIGINALS.values()
    }
