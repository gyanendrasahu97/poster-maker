from __future__ import annotations

import os
import sys
from pathlib import Path


CLASSROOM_ROOT = Path(os.environ.get("CLASSROOM_ROOT", r"C:\Users\gyane\.gemini\antigravity\classroom"))
BACKEND = CLASSROOM_ROOT / "backend"


def load_backend_env() -> None:
    env_path = BACKEND / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    load_backend_env()
    env_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if env_key:
        print(env_key, end="")
        return 0

    if str(BACKEND) not in sys.path:
        sys.path.insert(0, str(BACKEND))

    from supabase import create_client
    from app.core.config import settings
    from app.services.encryption import encryption_service

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        print("No GOOGLE_API_KEY env var and Supabase settings are missing.", file=sys.stderr)
        return 2

    supa = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    rows = supa.table("institutes").select("id,name,secrets").execute().data or []
    candidates: list[str] = []
    for row in rows:
        try:
            secrets = encryption_service.decrypt_json(row.get("secrets") or {})
        except Exception:
            continue
        key = secrets.get("GOOGLE_API_KEY")
        if isinstance(key, str) and key.strip():
            key = key.strip()
            if key.startswith("YOUR_") or "YOUR_" in key or key.lower().startswith("placeholder"):
                continue
            candidates.append(key)

    for key in candidates:
        if key.startswith("AQ."):
            print(key, end="")
            return 0
    if candidates:
        print(candidates[0], end="")
        return 0

    print("GOOGLE_API_KEY not found in env or institute secrets.", file=sys.stderr)
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
