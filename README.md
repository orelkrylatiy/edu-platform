# Learning Workspace

A private, single-user learning workspace with a complete System Analyst Wiki-derived curriculum. The application is private when deployed; the source repository is public, including the three curated educational Markdown documents. React/Vite, FastAPI, SQLite, optional Humanizer provider adapters.

## Local development
```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export WORKSPACE_PASSWORD='choose-a-long-password'
uvicorn server.app:app --reload --port 8000
# separate terminal
npm install
npm run dev
```
First authenticate at http://localhost:8000/api/content (HTTP Basic username `learner`, password above). For a reliable single-origin login, use the production build served on port 8000. The Vite development proxy forwards API requests.
Build with `npm run build`; then FastAPI serves the built UI at port 8000.

## VPS
Copy .env.example to .env, set a strong password, then `docker compose up -d --build`.
The service binds only to 127.0.0.1:8000. Put it behind an HTTPS reverse proxy.
SQLite is persisted in the workspace-data Docker volume (back up via SQLite online backup or stop service first).
Never expose Basic authentication over plain HTTP on the internet.
See docs/deployment.md, docs/architecture.md and docs/content.md.

## AI
Direct OpenAI and GLM use server-side API keys. Humanizer and OpenCode use the pinned optional Python dependency in requirements-humanizer.txt; install on host for OpenCode and configure its isolated service account. Default Docker build includes Humanizer but not the OpenCode executable. The framework is used at provider level, not as a writing style normalizer. The explicit enable flag controls OpenCode, including within Humanizer. Explicit provider selection, no silent fallback except Auto, which tries configured providers. Without credentials, study features remain functional and chat reports an error. No tools or file execution exposed to the AI. Technical output is not humanized.

## Courses and documentation

The System Analyst course imports 30 days / 119 roadmap checkboxes, the original 13 Practice Lab checkboxes, and the Scorecard rubric. See [content format](docs/content.md) to add courses or synchronize an approved Wiki source; no personal vault export is needed. Run `python -m scripts.validate_courses` to inspect the catalog.

## Quality
`npm run lint`, `npm run format:check`, `npm test`, `npm run build`.
`pip install -r requirements-dev.txt && ruff check server tests && pytest`.
CI configurations for GitHub and GitLab are included.

Browser tests: build first, then `npx playwright install chromium && npm run e2e`. CI captures every main view in desktop and mobile layouts, including the learning library, Lab, chat and skeleton. Optional manual deployment follows the existing deploy-infrastructure service-source workflow; see deploy/ and docs/deployment.md.
