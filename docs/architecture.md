# Learning Workspace — architecture and operational audit

## Services

```text
Guest landing + learner workspace (React + Vite assets)
    | HTTPS + HttpOnly session cookie (reverse proxy)
FastAPI + Uvicorn (per-account state, session login and course enrollment)
    |- /api/auth/*: login, registration, logout, persistent sessions
    |- /api/catalog: public-safe course discovery
    |- /api/enrollments: account-specific course selection
    |- /api/content: authenticated content-as-code course loader
    |- /api/state: SQLite persistent records
    |- /api/chat: scoped mentor chat
    |- /api/providers: configured provider status
    | AI Gateway:
    |   |- OpenAI HTTP
    |   |- Z.AI / GLM HTTP
    |   |- Humanizer HarnessProvider (optional installed dependency)
    |   `- OpenCode CLI (optional, isolated service account)
    `- /health: unauthenticated liveness
SQLite: users/argon2id, hashed session tokens, enrollments, per-user records, AI quotas
Browser localStorage: user-id-namespaced drafts, UI preferences and timer deadline
```

Every API write requires authenticated same-origin credentials and the
`X-Workspace: 1` header. Keep the reverse proxy on HTTPS and rate-limit
chat in production. Per-user daily AI quotas and independent chat locks are enforced. AI keys never enter the frontend. The backend never
executes the mentor's output as code; Markdown images are blocked from
automatic network fetching.

## What AI receives

The selected day or Lab section, the selected checklist item if any,
the learner's saved answer and note, other answers in that section,
a small sample of previously saved artifacts, the assessment rubric for
reviewer/interviewer mode, and bounded conversation history.
The planner receives bounded study/rubric progress.
There is **no file system tool access**. A successful web/UI test using
an AI mock is not an end-to-end test with live GLM/OpenAI credentials.

## SQLite and resilience

`server/store.py` uses SQLite with WAL, UPSERT and a primary key over
(user_id,kind,id) for active state; the previous (kind,id) table is preserved
for non-destructive migration. Run the online backup via `python scripts/backup.py SOURCE DEST`
and periodically perform a restore drill. Do not back up a single live WAL
database file by naive copying while writes are in progress.

The SPA uses debounced text saves and per-account browser-local draft recovery. Mobile
view uses the same API, so data syncs across browsers after reload.
Simultaneous device edits currently use last-write-wins. Each user owns disjoint
`user_records` rows and `enrollments` records; legacy rows are copied to the
bootstrap owner.

## Content and progress

The repository contains versioned source documents and generated course
metadata. The loaded lesson IDs remain stable; tasks have separate IDs.
All 30 curriculum days are separate from Practice Lab exercises.
An assessment rubric is manually rated 0–2; AI never writes the score.
Course completion counts mandatory roadmap items; Lab completion is
reported separately. A read-only source document is always available
so no link or explanatory note is omitted from the structured view.

## Limitations / release gates

- Live GLM/OpenAI/OpenCode/Humanizer calls require your own configured
  credentials and smoke tests on the actual server. Provider status in
  Settings indicates configuration, not that a request was accepted.
- No server-sent token streaming, semantic search, vector DB or background
  learning agent is implemented. They are deliberately out of the MVP.
- Authentication is multi-user Argon2id + HttpOnly SameSite=Lax cookie (Secure on HTTPS), with legacy owner Basic compatibility during transition. Registration is off by default; an invite code is recommended. No email-based password reset, email verification or billing is provided.
- No data-import restore screen yet; export/backup remain supported.
- The original Wiki labels all three source files AI-assisted and unreviewed.
  Editorial correctness is separate from faithful technical import.
- The public repository intentionally exposes only the selected educational
  documents. Inspect new sync diffs before publishing.
