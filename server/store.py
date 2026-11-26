"""SQLite persistence with isolated per-account state and restart-safe sessions.

Existing records(kind,id,value) are retained and copied once to the bootstrap
owner. The old table is never dropped: migrations are non-destructive.
"""
import hashlib
import json
import os
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

PASSWORDS = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY_HASH = PASSWORDS.hash("this-is-not-a-valid-account-password")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class Store:
    def __init__(self, path: Path):
        self.path = path
        self._initialized = False
        self._lock = threading.RLock()

    def _prepare(self, db: sqlite3.Connection) -> None:
        with self._lock:
            if self._initialized:
                return
            db.execute("BEGIN IMMEDIATE")
            try:
                db.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS records (
                        kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,
                        PRIMARY KEY(kind,id)
                    );
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT COLLATE NOCASE NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL CHECK(role IN ('owner','member')),
                        created_at INTEGER NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS user_records (
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,
                        PRIMARY KEY(user_id,kind,id)
                    );
                    CREATE TABLE IF NOT EXISTS sessions (
                        token_hash TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        expires_at INTEGER NOT NULL,
                        created_at INTEGER NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                    CREATE TABLE IF NOT EXISTS enrollments (
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        course_id TEXT NOT NULL,
                        created_at INTEGER NOT NULL,
                        PRIMARY KEY(user_id,course_id)
                    );
                    CREATE TABLE IF NOT EXISTS auth_throttle (
                        key TEXT PRIMARY KEY, attempts INTEGER NOT NULL,
                        window_start INTEGER NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS ai_usage (
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        day TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY(user_id,day)
                    );
                    CREATE TABLE IF NOT EXISTS schema_meta (
                        key TEXT PRIMARY KEY, value TEXT NOT NULL
                    );
                    """
                )
                # executescript commits its own transaction; obtain the write lock
                # again for the bootstrap and one-time legacy data migration.
                db.execute("BEGIN IMMEDIATE")
                username = os.getenv("WORKSPACE_USER", "learner").strip() or "learner"
                password = os.getenv("WORKSPACE_PASSWORD", "")
                owner = db.execute(
                    "SELECT id,password_hash FROM users WHERE role='owner' ORDER BY id LIMIT 1"
                ).fetchone()
                if owner is None and password:
                    db.execute(
                        "INSERT INTO users(username,password_hash,role,created_at) "
                        "VALUES(?,?,'owner',?)",
                        (username, PASSWORDS.hash(password), int(time.time())),
                    )
                    owner = db.execute(
                        "SELECT id,password_hash FROM users WHERE role='owner' "
                        "ORDER BY id LIMIT 1"
                    ).fetchone()
                # Password is only a bootstrap secret. Once created, the owner's
                # regular login is backed by the DB hash, not an environment file.
                if owner:
                    user_id = owner[0]
                    migrated = db.execute(
                        "SELECT value FROM schema_meta WHERE key='legacy_records_migrated'"
                    ).fetchone()
                    if migrated is None:
                        db.execute(
                            "INSERT OR IGNORE INTO user_records(user_id,kind,id,value) "
                            "SELECT ?,kind,id,value FROM records",
                            (user_id,),
                        )
                        db.execute(
                            "INSERT INTO schema_meta(key,value) "
                            "VALUES('legacy_records_migrated','1')"
                        )
                    db.execute(
                        "INSERT OR IGNORE INTO enrollments(user_id,course_id,created_at) "
                        "VALUES(?,'system-analyst',?)",
                        (user_id, int(time.time())),
                    )
                db.commit()
                self._initialized = True
            except Exception:
                db.rollback()
                raise

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=20)
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=20000")
        db.execute("PRAGMA journal_mode=WAL")
        try:
            if not self._initialized:
                self._prepare(db)
            with db:
                yield db
        finally:
            db.close()

    def owner(self):
        with self.connect() as db:
            row = db.execute(
                "SELECT id,username,role FROM users WHERE role='owner' ORDER BY id LIMIT 1"
            ).fetchone()
        return dict(zip(("id", "username", "role"), row)) if row else None

    def user(self, user_id: int):
        with self.connect() as db:
            row = db.execute(
                "SELECT id,username,role FROM users WHERE id=?", (user_id,)
            ).fetchone()
        return dict(zip(("id", "username", "role"), row)) if row else None

    def authenticate(self, username: str, password: str):
        with self.connect() as db:
            row = db.execute(
                "SELECT id,username,password_hash,role FROM users WHERE username=?",
                (username,),
            ).fetchone()
        expected = row[2] if row else DUMMY_HASH
        try:
            valid = PASSWORDS.verify(expected, password)
        except (VerificationError, InvalidHashError):
            valid = False
        if not row or not valid:
            return None
        return {"id": row[0], "username": row[1], "role": row[3]}

    def create_user(self, username: str, password: str):
        if self.owner() is None:
            raise RuntimeError("Owner account must be bootstrapped before registration")
        password_hash = PASSWORDS.hash(password)
        with self.connect() as db:
            try:
                cur = db.execute(
                    "INSERT INTO users(username,password_hash,role,created_at) "
                    "VALUES(?,?,'member',?)",
                    (username, password_hash, int(time.time())),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError("Username already exists") from exc
            user_id = cur.lastrowid
        return self.user(user_id)

    def new_session(self, user_id: int, remember: bool):
        token = secrets.token_urlsafe(48)
        lifetime = 30 * 86400 if remember else 12 * 3600
        now = int(time.time())
        with self.connect() as db:
            db.execute(
                "INSERT INTO sessions(token_hash,user_id,expires_at,created_at) "
                "VALUES(?,?,?,?)",
                (hash_token(token), user_id, now + lifetime, now),
            )
        return token, lifetime

    def resolve_session(self, token: str | None):
        if not token or len(token) > 300:
            return None
        with self.connect() as db:
            row = db.execute(
                "SELECT u.id,u.username,u.role FROM sessions s "
                "JOIN users u ON u.id=s.user_id "
                "WHERE s.token_hash=? AND s.expires_at>?",
                (hash_token(token), int(time.time())),
            ).fetchone()
        return dict(zip(("id", "username", "role"), row)) if row else None

    def revoke_session(self, token: str | None):
        if token:
            with self.connect() as db:
                db.execute("DELETE FROM sessions WHERE token_hash=?", (hash_token(token),))

    def enroll(self, user_id: int, course_id: str):
        with self.connect() as db:
            db.execute(
                "INSERT OR IGNORE INTO enrollments(user_id,course_id,created_at) "
                "VALUES(?,?,?)",
                (user_id, course_id, int(time.time())),
            )

    def enrolled(self, user_id: int, course_id: str) -> bool:
        with self.connect() as db:
            return db.execute(
                "SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?",
                (user_id, course_id),
            ).fetchone() is not None

    def enrollments(self, user_id: int):
        with self.connect() as db:
            return [
                row[0] for row in db.execute(
                    "SELECT course_id FROM enrollments WHERE user_id=? ORDER BY created_at,course_id",
                    (user_id,),
                )
            ]

    def all(self, user_id: int | None = None):
        with self.connect() as db:
            if user_id is None:
                owner = db.execute(
                    "SELECT id FROM users WHERE role='owner' LIMIT 1"
                ).fetchone()
                user_id = owner[0] if owner else None
            if user_id is None:
                rows = db.execute("SELECT kind,id,value FROM records").fetchall()
            else:
                rows = db.execute(
                    "SELECT kind,id,value FROM user_records WHERE user_id=?",
                    (user_id,),
                ).fetchall()
        return [{"kind": kind, "id": key, "value": json.loads(value)}
                for kind, key, value in rows]

    def put(self, kind: str, key: str, value, user_id: int | None = None):
        with self.connect() as db:
            if user_id is None:
                owner = db.execute(
                    "SELECT id FROM users WHERE role='owner' LIMIT 1"
                ).fetchone()
                user_id = owner[0] if owner else None
            serialized = json.dumps(value, ensure_ascii=False)
            if user_id is None:
                db.execute(
                    "INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) "
                    "DO UPDATE SET value=excluded.value",
                    (kind, key, serialized),
                )
            else:
                db.execute(
                    "INSERT INTO user_records VALUES(?,?,?,?) ON CONFLICT(user_id,kind,id) "
                    "DO UPDATE SET value=excluded.value",
                    (user_id, kind, key, serialized),
                )

    def get(self, kind: str, key: str, default=None, user_id: int | None = None):
        with self.connect() as db:
            if user_id is None:
                owner = db.execute(
                    "SELECT id FROM users WHERE role='owner' LIMIT 1"
                ).fetchone()
                user_id = owner[0] if owner else None
            if user_id is None:
                row = db.execute(
                    "SELECT value FROM records WHERE kind=? AND id=?", (kind, key)
                ).fetchone()
            else:
                row = db.execute(
                    "SELECT value FROM user_records WHERE user_id=? AND kind=? AND id=?",
                    (user_id, kind, key),
                ).fetchone()
        return json.loads(row[0]) if row else default

    def throttle(self, key: str, limit: int, window_seconds: int) -> bool:
        """Return False once a key exceeds the allowed number of requests."""
        now = int(time.time())
        with self.connect() as db:
            row = db.execute(
                "SELECT attempts,window_start FROM auth_throttle WHERE key=?", (key,)
            ).fetchone()
            if not row or now - row[1] >= window_seconds:
                db.execute(
                    "INSERT INTO auth_throttle(key,attempts,window_start) VALUES(?,1,?) "
                    "ON CONFLICT(key) DO UPDATE SET attempts=1,window_start=excluded.window_start",
                    (key, now),
                )
                return True
            if row[0] >= limit:
                return False
            db.execute("UPDATE auth_throttle SET attempts=attempts+1 WHERE key=?", (key,))
        return True

    def clear_throttle(self, key: str):
        with self.connect() as db:
            db.execute("DELETE FROM auth_throttle WHERE key=?", (key,))

    def charge_ai(self, user_id: int, daily_limit: int) -> bool:
        if daily_limit <= 0:
            return False
        today = time.strftime("%Y-%m-%d", time.gmtime())
        with self.connect() as db:
            db.execute(
                "INSERT OR IGNORE INTO ai_usage(user_id,day,requests) VALUES(?,?,0)",
                (user_id, today),
            )
            cur = db.execute(
                "UPDATE ai_usage SET requests=requests+1 WHERE user_id=? AND day=? "
                "AND requests<?",
                (user_id, today, daily_limit),
            )
        return cur.rowcount == 1

    def refund_ai(self, user_id: int):
        today = time.strftime("%Y-%m-%d", time.gmtime())
        with self.connect() as db:
            db.execute(
                "UPDATE ai_usage SET requests=MAX(0,requests-1) "
                "WHERE user_id=? AND day=?",
                (user_id, today),
            )
