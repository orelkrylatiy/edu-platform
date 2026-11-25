# Initial engineering review

## Implemented
- Server-side records for tasks, notes, written attempts, skills, sessions and mentor histories.
- Browser-local draft recovery; debounced save; explicit save and error feedback.
- Timer uses an absolute deadline and a stable session ID; 5-minute breaks do not count.
- Public-safe curriculum, explicit local import and read-only private content mount.
- Mentor mode per lesson/task, no repository tool execution, bounded context, configured provider selection.
- Same-origin HTTP Basic authentication, required custom write header, loopback container binding.
- CI: lint, formatting, tests, build for GitHub and GitLab.

## Remaining release checks
- Playwright desktop/mobile smoke test and screenshot artifacts added; inspect results. Full keyboard/accessibility audit still pending.
- Live provider smoke tests with owner's configured credentials, especially OpenCode.
- HTTPS reverse proxy, rate limiting, backup restore drill, VPS deployment.
- Lock dependency graph and enforce formatter checks against committed files; current CI runs formatting before check.
- Content is a scaffold, not the complete private Practice Lab/Scorecard. Import and adapt remaining teaching materials.
- Single-user app; no offline sync, no automatic AI grading, no integrated SQL executor, no production multi-user security.
- Local drafts are browser-specific; concurrent edits from multiple tabs/devices are last-write-wins.
