import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3
import subprocess
import sys
from urllib.parse import urlparse

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings  # noqa: E402


def _resolve_sqlite_path(database_url: str) -> Path:
    raw = database_url[len("sqlite:///") :]
    p = Path(raw)
    if not p.is_absolute():
        p = (BACKEND_DIR / p).resolve()
    return p


def _prune_old_backups(backup_dir: Path, retention_days: int) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    removed = 0
    for item in backup_dir.iterdir():
        if not item.is_file():
            continue
        mtime = datetime.fromtimestamp(item.stat().st_mtime, tz=timezone.utc)
        if mtime < cutoff:
            item.unlink()
            removed += 1
    return removed


def backup_database(
    database_url: str | None = None,
    backup_dir: Path | str | None = None,
    retention_days: int = 30,
) -> Path:
    """Back up SQLite (via sqlite3.backup) or MySQL (via mysqldump) with retention pruning."""
    url = database_url or settings.DATABASE_URL
    target_dir = Path(backup_dir) if backup_dir else (BACKEND_DIR / "backups")
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if url.startswith("sqlite:///"):
        src_path = _resolve_sqlite_path(url)
        if not src_path.exists():
            raise FileNotFoundError(f"SQLite database file not found: {src_path}")
        dest_path = target_dir / f"kaoyan_{stamp}.db"
        with sqlite3.connect(src_path) as src_conn, sqlite3.connect(dest_path) as dst_conn:
            src_conn.backup(dst_conn)
    elif url.startswith("mysql"):
        parsed = urlparse(url.replace("mysql+pymysql://", "mysql://"))
        db_name = parsed.path.lstrip("/")
        dest_path = target_dir / f"kaoyan_{stamp}.sql"
        cmd = [
            "mysqldump",
            f"-h{parsed.hostname or 'localhost'}",
            f"-P{parsed.port or 3306}",
            f"-u{parsed.username or 'root'}",
        ]
        if parsed.password:
            cmd.append(f"-p{parsed.password}")
        cmd.append(db_name)
        with dest_path.open("wb") as fp:
            subprocess.run(cmd, stdout=fp, check=True)
    else:
        raise ValueError(f"Unsupported database URL for backup: {url}")

    _prune_old_backups(target_dir, retention_days)
    return dest_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Back up Smart Kaoyan Agent database.")
    parser.add_argument("--retention-days", type=int, default=30)
    args = parser.parse_args()
    out = backup_database(retention_days=args.retention_days)
    print(f"Backup created: {out}")
