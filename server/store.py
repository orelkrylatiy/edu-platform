import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path


class Store:
    def __init__(self, path: Path):
        self.path = path

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=10)
        try:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute(
                "CREATE TABLE IF NOT EXISTS records ("
                "kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,"
                "PRIMARY KEY(kind,id))"
            )
            with db:
                yield db
        finally:
            db.close()

    def all(self):
        with self.connect() as db:
            return [
                {"kind": kind, "id": key, "value": json.loads(value)}
                for kind, key, value in db.execute("SELECT kind,id,value FROM records")
            ]

    def put(self, kind, key, value):
        with self.connect() as db:
            db.execute(
                "INSERT INTO records VALUES (?,?,?) "
                "ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value",
                (kind, key, json.dumps(value, ensure_ascii=False)),
            )

    def get(self, kind, key, default=None):
        with self.connect() as db:
            row = db.execute(
                "SELECT value FROM records WHERE kind=? AND id=?", (kind, key)
            ).fetchone()
            return json.loads(row[0]) if row else default
