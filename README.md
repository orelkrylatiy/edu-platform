# Learning Workspace

A private, single-user learning workspace with a public-safe sample curriculum. React/Vite, FastAPI, SQLite, optional Humanizer provider adapters.

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
Open http://localhost:5173 (HTTP Basic username `learner`, password above).
Build with `npm run build`; then FastAPI serves the built UI at port 8000.

## VPS
Copy .env.example to .env, set a strong password, then `docker compose up -d --build`.
The service binds only to 127.0.0.1:8000. Put it behind an HTTPS reverse proxy.
SQLite is persisted in ./data (back up via SQLite online backup or stop service first).
Never expose Basic authentication over plain HTTP on the internet.
See docs/deployment.md and docs/content.md.

## AI
Direct OpenAI and GLM use server-side API keys. Humanizer and OpenCode use the pinned optional Python dependency in requirements-humanizer.txt; install on host for OpenCode and configure its isolated service account. Default Docker build includes Humanizer but not the OpenCode executable. Explicit provider selection, no silent fallback except Auto, which tries configured direct providers. Without credentials, study features remain functional and chat reports an error. No tools or file execution exposed to the AI. Technical output is not humanized.

## Quality
`npm run lint`, `npm run format:check`, `npm test`, `npm run build`.
`pip install -r requirements-dev.txt && ruff check server tests && pytest`.
CI configurations for GitHub and GitLab are included.
