"""On-demand GitHub content refresh, separate from application releases."""
import base64
import json
import logging
import os
import re
import tempfile
import time
from pathlib import Path
from threading import Lock
from urllib.parse import quote

import httpx

from .content import ROOT, load_courses

LOG = logging.getLogger(__name__)
SHA = re.compile(r"[a-f0-9]{40}")
COURSE = re.compile(r"content/courses/([a-z0-9][a-z0-9-]*)\.json")
SA = {
    "content/system-analyst/source/roadmap.md",
    "content/system-analyst/source/practice-lab.md",
    "content/system-analyst/source/scorecard.md",
}
MAX_BYTES = 16 * 1024 * 1024


def _identity(courses):
    """Existing keys must retain their kind and parent; no implicit deletion."""
    keys = {}
    for course in courses:
        cid = course["id"]
        keys[cid] = ("course",)
        for group in ("lessons", "practice", "documents", "rubric"):
            for item in course.get(group, []):
                keys[item["id"]] = (cid, group)
                for task in item.get("tasks", []):
                    keys[task["id"]] = (cid, item["id"], "task")
    return keys


class ContentSync:
    def __init__(self):
        self.lock = Lock()
        self.last_attempt = 0.0

    @property
    def repo(self):
        return os.getenv("CONTENT_REPOSITORY", "").strip()

    @property
    def branch(self):
        return os.getenv("CONTENT_BRANCH", "content")

    @property
    def interval(self):
        try:
            return max(60, int(os.getenv("CONTENT_SYNC_INTERVAL", "3600")))
        except ValueError:
            return 3600

    @property
    def path(self):
        db = Path(os.getenv("WORKSPACE_DB", str(ROOT / "data/workspace.sqlite3")))
        return db.parent / "course-cache.json"

    def snapshot(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if data.get("source") == self.repo + ":" + self.branch:
                return data
        except (OSError, ValueError, AttributeError):
            pass
        return {}

    def courses(self, public_only=False):
        cached = self.snapshot().get("courses") if self.repo else None
        return load_courses(public_only=public_only, public_courses=cached)

    def status(self):
        data = self.snapshot()
        return {
            "enabled": bool(self.repo),
            "repository": self.repo,
            "branch": self.branch,
            "interval_seconds": self.interval,
            "version": data.get("version", "bundled"),
            "last_checked_at": data.get("last_checked_at"),
            "last_success_at": data.get("last_success_at"),
            "status": data.get("status", "bundled") if self.repo else "disabled",
        }

    def _save(self, data):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        name = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=self.path.parent, delete=False
            ) as output:
                name = output.name
                json.dump(data, output, ensure_ascii=False)
                output.flush()
                os.fsync(output.fileno())
            os.replace(name, self.path)
        finally:
            if name and os.path.exists(name):
                os.unlink(name)

    def _fetch(self, current):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repo):
            raise ValueError("Invalid content repository")
        headers = {"Accept": "application/vnd.github+json"}
        token = os.getenv("CONTENT_GITHUB_TOKEN")
        if token:
            headers["Authorization"] = "Bearer " + token
        base = "https://api.github.com/repos/" + self.repo
        with httpx.Client(headers=headers, timeout=5.0, follow_redirects=False) as client:
            def get(path):
                response = client.get(base + path)
                response.raise_for_status()
                if len(response.content) > MAX_BYTES:
                    raise ValueError("Content response too large")
                return response.json()

            sha = get("/commits/" + quote(self.branch, safe=""))["sha"]
            if not SHA.fullmatch(sha):
                raise ValueError("Invalid content version")
            if current.get("version") == sha and current.get("courses"):
                return sha, current["courses"]
            tree = get("/git/trees/" + sha + "?recursive=1")
            if tree.get("truncated"):
                raise ValueError("Truncated content tree")
            entries = [
                item for item in tree["tree"]
                if COURSE.fullmatch(item["path"]) or item["path"] in SA
            ]
            if not entries or len(entries) > 250:
                raise ValueError("Unexpected content tree size")
            if sum(item.get("size", MAX_BYTES + 1) for item in entries) > MAX_BYTES:
                raise ValueError("Content exceeds size limit")
            paths = {item["path"] for item in entries}
            if paths & SA and not SA <= paths:
                raise ValueError("Incomplete System Analyst sources")
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                for item in entries:
                    if item["type"] != "blob" or not SHA.fullmatch(item["sha"]):
                        raise ValueError("Invalid content blob")
                    blob = get("/git/blobs/" + item["sha"])
                    if blob["encoding"] != "base64":
                        raise ValueError("Invalid blob encoding")
                    content = base64.b64decode(blob["content"])
                    if len(content) != item["size"]:
                        raise ValueError("Invalid blob size")
                    path = root / item["path"]
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(content)
                courses = load_courses(public_only=True, public_root=root)
                for course in courses:
                    if f"content/courses/{course['id']}.json" not in paths:
                        raise ValueError("Course filename must match its ID")
            return sha, courses

    def refresh(self, force=False):
        if not self.repo:
            return self.status()
        # A concurrent reader immediately receives the previous valid snapshot.
        if not self.lock.acquire(blocking=False):
            return {**self.status(), "status": "syncing"}
        try:
            current = self.snapshot()
            now = time.time()
            if not force and now - max(
                current.get("last_checked_at") or 0, self.last_attempt
            ) < self.interval:
                return self.status()
            self.last_attempt = now
            updated = {
                **current,
                "source": self.repo + ":" + self.branch,
                "last_checked_at": now,
            }
            try:
                sha, courses = self._fetch(current)
                if not courses:
                    raise ValueError("Empty catalog")
                baseline = current.get("courses") or load_courses(public_only=True)
                previous = _identity(baseline)
                candidate = _identity(courses)
                if any(candidate.get(key) != value for key, value in previous.items()):
                    raise ValueError("Existing content IDs removed or moved")
                # Validate public content together with local private overrides.
                load_courses(public_courses=courses)
                updated.update(
                    version=sha, courses=courses, status="success", last_success_at=time.time()
                )
            except Exception:
                LOG.warning("Course refresh failed; retaining last known good content")
                updated["status"] = "error"
            try:
                self._save(updated)
            except OSError:
                LOG.warning("Course cache is not writable")
                return {**self.status(), "status": "error"}
            return self.status()
        finally:
            self.lock.release()


content_sync = ContentSync()
