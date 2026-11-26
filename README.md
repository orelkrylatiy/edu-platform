# Learning Workspace

A self-hosted learning platform for **separate user accounts**, a browsable course catalog, learning notes, AI chat and Pomodoro sessions.

**Stack:** React + Vite, FastAPI, SQLite (WAL), Argon2id password hashes, HttpOnly cookie sessions, and OpenAI / GLM / optional Humanizer adapters. Only the selected educational Wiki documents are published in this repository.

## Production quick start

1. Back up the **existing** SQLite volume before updating an older installation.
2. Copy \`.env.example\` to \`.env\`. Generate a strong bootstrap owner username/password and optional invite code with \`python scripts/generate_credentials.py\`. **Never commit these values.**
3. Configure \`WORKSPACE_PASSWORD\`, \`WORKSPACE_USER\`, \`WORKSPACE_COOKIE_SECURE=1\`, and set \`WORKSPACE_PUBLIC_ORIGIN=https://your-domain.example\`.
4. For invited new accounts, set \`WORKSPACE_ALLOW_REGISTRATION=1\` and a strong \`WORKSPACE_INVITE_CODE\`. Leave registration closed until you are ready to share.
5. Deploy with \`docker compose up -d --build\`, or the documented VPS/systemd flow. Keep port 8000 bound to loopback behind a TLS reverse proxy. Open the domain and sign in **once** using the owner credentials. Select “Оставаться в системе” to keep a 30-day browser session.

**Existing installations:** the schema upgrade copies the old single-user \`records\` table to the owner’s account, preserving notes, lessons, chat, and focus sessions without deleting the original table. The owner is automatically enrolled in System Analyst. No prior password is exposed or stored in the frontend. Old HTTP Basic browser credentials are supported as a one-time transition, but some browsers may require one new login. Logging out clears the cookie and suppresses legacy Basic auto-login.

**New learners:** visitors can view the public catalog without signing in. Invitees can register their own username/password, choose available courses, and study independently. Progress, notes, chat, focus history, drafts, and timers are scoped to their account. Members cannot access courses mounted in \`content/private\`.

## Local development

\`\`\`sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export WORKSPACE_USER=learner
export WORKSPACE_PASSWORD='local-test-password-use-your-own'
export WORKSPACE_COOKIE_SECURE=0
export WORKSPACE_ALLOW_REGISTRATION=1
uvicorn server.app:app --reload --port 8000
# separate terminal
npm install
npm run dev
\`\`\`

Use the Vite dev origin for React with its API proxy, or \`npm run build\` and browse the single-origin FastAPI service on port 8000.

## AI costs and security

All AI keys are **server-side**. Each account shares configured providers, with a default limit of 20 AI requests per UTC day (\`WORKSPACE_AI_DAILY_LIMIT\`). The owner can change this. Humanizer and OpenCode are optional; Docker includes the Python Humanizer adapter but not the OpenCode CLI. Explicit provider selections do not silently fall back; Auto chooses an available provider.

Passwords are hashed using Argon2id. Session cookies are random opaque bearer tokens, stored only as SHA256 hashes server-side in persistent SQLite. Cookie flags: HttpOnly, SameSite=Lax, Secure on HTTPS. “Remember me” keeps the session for up to 30 days; without it the browser session cookie is non-persistent and the server session expires after 12 hours. Logout revokes the token. Registration is **disabled by default**. Configure invite mode for external learners; review your AI budget before enabling open registration.

CSRF defenses require a custom X-Workspace header on writes and validate Origin. Secure cookies require actual HTTPS at the reverse proxy. The backend exposes no AI tool/file access.

## Content and operations

The System Analyst curriculum includes the complete original 30-day roadmap, 119 tasks, 13 source Practice Lab checks, the eight-criterion Scorecard, all original links and Wiki reference documents.

- [Course format, sources and sync](docs/content.md)
- [Deployment and migrations](docs/deployment.md)
- [Architecture, security and limitations](docs/architecture.md)

For quality checks: \`npm run lint && npm run format:check && npm test && npm run build\`; \`pip install -r requirements-dev.txt && ruff check server tests && pytest\`; \`npx playwright install chromium && npm run e2e\`.

GitHub Actions and GitLab CI run checks; a manual production deployment workflow is configured but not invoked automatically. Browser CI captures guest/auth/catalog, desktop/mobile, dark/light, lessons, chat and focus screens.
