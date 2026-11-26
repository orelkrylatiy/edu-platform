"""Legacy command; use explicit full-source sync instead of partial checkbox import."""
raise SystemExit(
    "Partial roadmap import was deprecated. Use: "
    "python -m scripts.sync_system_analyst /path/to/ObsidianVault [--apply]. "
    "This preserves all three Wiki source documents and stable lesson IDs."
)
