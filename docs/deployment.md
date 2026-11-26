# VPS deployment and migration

## Security checklist

- Use **HTTPS** with a real certificate (Caddy or Nginx proxy) and bind Uvicorn/Docker to `127.0.0.1:8000`, not the internet.
- Set a strong owner account via `WORKSPACE_USER` and `WORKSPACE_PASSWORD`. Run `python scripts/generate_credentials.py` on your own trusted machine, copy the values into private VPS `.env`, and never paste them into a public issue or Git repository.
- Use `WORKSPACE_COOKIE_SECURE=1` on HTTPS; set `WORKSPACE_PUBLIC_ORIGIN=https://example.com` to the actual origin. Only for localhost HTTP tests or the Vite development proxy use `WORKSPACE_COOKIE_SECURE=0` (allows the local `:5173` Vite origin).
- Public registration: `WORKSPACE_ALLOW_REGISTRATION=1`; for a private invite-only rollout also set an unpredictable `WORKSPACE_INVITE_CODE`. Leaving registration at `0` is the safest default.
- Rotate any compromised invite or API keys. Use a single trusted reverse proxy, firewall, request limits and backups. Owner credentials are bootstrap-only; after initial setup, the password hash resides in SQLite.
- All users share server AI keys. The per-user UTC request quota defaults to 20/day; configure `WORKSPACE_AI_DAILY_LIMIT` for your budget. This is not full billing or identity verification.

## Docker Compose

```sh
cp .env.example .env
python scripts/generate_credentials.py  # copy only the values you need
# edit .env (permissions 600)
chmod 600 .env
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:8000/health
```

The Compose service persists SQLite at `/app/data/workspace.sqlite3` in the `workspace-data` volume and mounts `content/private` read-only. It intentionally exposes only loopback HTTP, so a TLS proxy and domain configuration are required.

Test login through the actual HTTPS domain (not merely a health check), check the cookie is `HttpOnly; Secure; SameSite=Lax`, then test reload, logout, login, registration, course enrollment and that a second user has independent notes and sessions.

## Upgrading the existing single-user deployment

1. Stop automatic deployments, check SQLite location and take an **online SQLite backup** while service is still functioning:
   `python scripts/backup.py /path/to/workspace.sqlite3 /backup/workspace-$(date +%F).sqlite3`
2. Keep the same `WORKSPACE_DB` path/volume; **do not** delete the SQLite volume or run `docker compose down -v`.
3. Keep the **same** `WORKSPACE_USER` and `WORKSPACE_PASSWORD` values for bootstrap on first multi-user startup. The migration creates the owner account and copies all legacy rows to `user_records` once; the old `records` table is preserved as rollback evidence.
4. Deploy the new code, sign in as the owner through the login dialog, then verify saved chat, notes, focus history and completion. Cookie login does **not** reuse the previous browser Basic login in all browsers; a one-time new login may be necessary. Choose the 30-day “Remember me” option.
5. Test a **new** invited account independently. If restoring a previous release, restore the **matching DB backup** as well; never apply backward-incompatible schema changes to an unbacked-up database.

Additional browser-only preferences and drafts are moved from the former origin-wide localStorage keys into an owner-namespaced prefix on the owner's first login. These old keys are not imported into new accounts.

## Existing deploy-manager / systemd

The manual GitHub deploy workflow `.github/workflows/deploy.yml` runs only from `main` after manual dispatch with the `production` environment. Required GitHub secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, and repo variable `DEPLOY_PROJECT`. Follow `deploy/project.toml` and `deploy/edu-platform.service`; ensure the shared `data` and `.env` paths survive releases.

Do not run Docker and systemd on port 8000 simultaneously. OpenCode is optional: install/authenticate the CLI as a dedicated service account only, and enable it explicitly. Direct OpenAI/GLM keys are sufficient for Docker.

## Known limitations

Account recovery is performed by an administrator using a maintenance procedure; **there is no public password-reset-by-email workflow**. Do not enable public registration without an abuse-management and email-verification plan. No multi-user roles beyond owner/member, no subscription billing, and no real-time push sync between multiple tabs are provided. Study data and course content update on reload or requests.

Always test the first deployment against a staging domain before publishing. A green CI run is not proof that the target VPS domain, TLS, DNS or live AI keys are configured.
