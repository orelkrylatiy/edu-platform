# Learning Workspace content contract — v1

The learning platform is **content-as-code**. Runtime user state belongs to SQLite,
while courses and source documents belong to Git. These must never be mixed.

## Standard course manifest

Add `content/courses/<slug>.json`. The loader validates unique IDs across
courses, lessons, practice activities, documents, and tasks. Example:

```json
{
  "id": "my-course",
  "title": "My Course",
  "description": "A course with practical evidence",
  "skills": ["HTTP", "SQL"],
  "lessons": [
    {
      "id": "my-course-01",
      "title": "HTTP methods",
      "module": "API",
      "kind": "day",
      "minutes": 60,
      "body": "## Objective\nExplain idempotency.\n\n[MDN](https://developer.mozilla.org/)",
      "tasks": [
        {
          "id": "my-course-01-task-01",
          "text": "Explain PUT versus POST, then save your own answer.",
          "type": "practice",
          "optional": false
        }
      ]
    }
  ],
  "practice": [
    {
      "id": "my-course-practice-01",
      "title": "Design an endpoint",
      "module": "Lab",
      "kind": "practice",
      "group": "case",
      "minutes": 45,
      "body": "Describe edge cases and the retry contract.",
      "tasks": [
        {
          "id": "my-course-practice-01-task-01",
          "text": "Draft your contract.",
          "type": "practice",
          "optional": false
        }
      ]
    }
  ],
  "documents": [
    {
      "id": "my-course-reference",
      "title": "Reference guide",
      "body": "# Reference\nFull markdown source",
      "source": "https://example.org/reference",
      "read_only": true
    }
  ],
  "rubric": [
    { "id": "my-course-rubric-01", "title": "Correct contract", "max": 2 }
  ]
}
```

`lessons` are ordered; `practice`, `documents` and `rubric` are optional.
Use valid Markdown for `body` and `text`. External links keep their original URLs.
Lessons are not limited to 30 days. The UI may add further block types later
without migrating existing progress.

**ID stability is non-negotiable.** IDs are data keys, not display labels.
Renaming a lesson must not rename its ID. Completion, note, answer and chat
history are persisted under these keys. Never reuse a deleted ID for new content.
Source version changes should use explicit migrations for reordered tasks.

## System Analyst source-of-truth adapter

We transferred **exactly three educational files** from the private Wiki.
They now live at:

- `content/system-analyst/source/roadmap.md`
- `content/system-analyst/source/practice-lab.md`
- `content/system-analyst/source/scorecard.md`

The raw Markdown files were copied without trimming or rewriting their
source. They still carry `provenance: ai-assisted` and `reviewed: false`.
Only these selected educational documents were copied. **No unrelated
private Wiki files, contacts, personal work history or vault exports.**

`server/course_import.py` builds the platform course from these sources on
each content request. The original `content/courses/system-analyst.json` is
a **legacy fallback demo** only when the source documents are absent.
The loader gives precedence to `content/private/system-analyst.json` for a
private override. Avoid editing both the public fallback and source files.

The adapter enforces 30 days, 119 roadmap checkboxes, 13 source Practice Lab
checkboxes, and eight Scorecard rubric criteria. Order Management, diagnostic
hints, unfamiliar cases, complete original links and explanatory paragraphs
remain in the three source documents. Extra “complete this section” tasks for
non-checkbox Lab sections are explicitly marked `origin: "derived"`.

Platform IDs stay `sa-01` … `sa-30` so existing lesson notes survive.
Old **demo checklist** keys are not equated with real educational work and are
intentionally not marked as complete. Current real tasks use positional
`sa-01-task-01` IDs: avoid inserting/reordering old checkboxes without a
planned data migration. Practice IDs are based on section titles.

## Updating from the private Wiki

Edit the Markdown source files directly in this project, or synchronize
the three exact files explicitly:

```sh
python -m scripts.sync_system_analyst /path/to/ObsidianVault
python -m scripts.sync_system_analyst /path/to/ObsidianVault --apply
python -m scripts.validate_courses
pytest tests/test_course_import.py
```

The first command is a read-only validation/diff summary. `--apply`
explicitly overwrites the three public course copies. **Inspect the diff**
before committing and confirm that the new text is safe to publish in a
public GitHub repository. The source adapter fails on unexpected structural
changes rather than silently dropping content.

Only the known three document names are resolvable as in-app Obsidian
links. The roadmap's `[[Interview Preparation Plan]]` link goes back to
your **private** Wiki and requires your GitHub authorization; its content
is not copied. External HTTP links are untouched. In-app source documents
render headings, GFM tables, links and collapsible `<details>` hints.
Remote inline images are deliberately not downloaded automatically.

## Validation and provenance

All courses are checked by `server/content.py`; source-specific constraints
are enforced in `server/course_import.py`. `tests/test_course_import.py`
guards the critical counts and source preservation. Review linked resources
for freshness as a separate editorial task; content import is lossless but
does not claim every third-party URL is still live.

The full course is substantial source material, not a claim that every lesson
has been independently pedagogically validated. Editing the curriculum or
adding learning exercises should preserve its original framing and be clearly
labelled as additional material.

## English Speaking course

`content/courses/english-speaking.json` is a standard manifest, with 56 ordered
lessons (`en-01` to `en-56`), eight weekly checkpoints, four speaking labs,
three reference documents and five assessment criteria (0–2 each). This is an
AI-assisted public curriculum adaptation, not a verbatim copy of the private
Wiki or a sync adapter. Personal observations, private paths, learner logs and
account data are excluded. Review source links and pedagogy before publication.
The platform mentor is text-only; actual listening, speaking and pronunciation
practice need external audio or a conversation partner. Record only nonconfidential
summaries in learner state. English mentor behavior is selected by course ID.
Do not rename lesson/task IDs or mark completion based solely on AI output.
