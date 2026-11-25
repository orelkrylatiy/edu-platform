# VPS deployment

Single-user, same-origin app. Set WORKSPACE_PASSWORD (strong unique password) and optional provider credentials in server .env, not in Git. HTTPS required. Docker Compose exposes loopback only; configure Nginx/Caddy with TLS and proxy to 127.0.0.1:8000. Restrict SSH and keep backups of SQLite using the online backup API. For an existing deploy-manager installation, choose service/source, persistent data directory and .env outside releases, a dedicated systemd account and health check /health. Use manual deploy until tested with your server. No VPS credentials or domain assumed.

OpenCode is optional and requires installing the CLI on the host, authenticating as the dedicated service account and setting WORKSPACE_ENABLE_OPENCODE=1 plus HUMANIZER_OPENCODE_MODEL. Do not reuse an ambient developer account. Humanizer's provider gateway includes OpenCode only when explicitly enabled and configured. Keep AI service isolated from host secrets. Direct keys are sufficient for the Docker deployment.

## Existing deployment manager

The manual GitHub workflow deploy.yml follows the service-source workflow in deploy-infrastructure. It runs only from main with the production environment. Configure DEPLOY_PROJECT=edu-platform and DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS secrets. Adapt deploy/project.toml and deploy/edu-platform.service; ensure shared paths are supported by your installed deploy-manager version, set the environment file and permissions, and test on staging. No automated push deployment is enabled. Docker Compose is an independent alternative, not run simultaneously on port 8000.
