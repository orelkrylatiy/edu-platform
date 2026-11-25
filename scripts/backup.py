"""Online SQLite backup. Store backup outside the application release."""
import argparse
import sqlite3
from pathlib import Path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    if not args.source.is_file() or args.destination.exists():
        raise SystemExit("Source must exist; destination must be new")
    with sqlite3.connect(args.source) as source, sqlite3.connect(args.destination) as destination:
        source.backup(destination)
    print("Backup saved")
