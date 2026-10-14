"""Dependency-free local regression baseline. Never accepts a remote URL.

Prepare once: python -B scripts/baseline-api.py prepare
Run tests after starting the generated local Worker: python -B scripts/baseline-api.py test
Artifacts contain synthetic credentials and remain in a dedicated OS temporary directory.
"""

import base64
import hashlib
import json
import math
import secrets
import shutil
import socket
import sqlite3
import statistics
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SANDBOX = Path(tempfile.gettempdir()) / "martina-k9-auth-baseline"
BASE = "http://127.0.0.1:8791"


def prepare():
    if SANDBOX.exists():
        raise RuntimeError("Refusing to overwrite existing sandbox; retain it for comparison.")
    source_dir = ROOT / ".wrangler/performance-baseline/v3/d1/miniflare-D1DatabaseObject"
    sources = [p for p in source_dir.glob("*.sqlite") if p.name != "metadata.sqlite"]
    if len(sources) != 1 or not (ROOT / "dist/index.html").exists():
        raise RuntimeError("Requires the verified migrated local copy and a current build.")
    with socket.socket() as port:
        port.bind(("127.0.0.1", 8791))
    source = sqlite3.connect(sources[0].as_uri() + "?mode=ro", uri=True)
    source.execute("PRAGMA query_only=ON")
    schema = source.execute("SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY type DESC").fetchall()
    source.close()
    SANDBOX.mkdir(parents=True)
    shutil.copytree(ROOT / "functions", SANDBOX / "functions")
    shutil.copytree(ROOT / "dist", SANDBOX / "dist")
    (SANDBOX / "wrangler.toml").write_text('name = "k9-local-regression-only"\npages_build_output_dir = "dist"\ncompatibility_date = "2025-05-01"\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "k9_ops_db"\ndatabase_id = "a67e5d3b-d14f-44b0-92c8-ee708c85a642"\nremote = false\n', encoding="utf-8")
    (SANDBOX / ".dev.vars").write_text('LOCAL_DEV_FULL_ACCESS=false\nAPP_URL=http://127.0.0.1:8791\n', encoding="utf-8")
    target = SANDBOX / "state/v3/d1/miniflare-D1DatabaseObject" / sources[0].name
    target.parent.mkdir(parents=True)
    db = sqlite3.connect(target)
    db.execute("PRAGMA foreign_keys=ON")
    for (sql,) in schema:
        db.execute(sql)
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()
    future = (now + timedelta(days=30)).isoformat()
    accounts = {}
    for workspace, status, end in [("a", "active", future), ("b", "active", future), ("readonly", "incomplete", None), ("expired", "active", (now-timedelta(days=1)).isoformat())]:
        db.execute("INSERT INTO workspaces(id,name,subscription_status,current_period_end,created_at,updated_at) VALUES(?,?,?,?,?,?)", (workspace, "Synthetic " + workspace, status, end, timestamp, timestamp))
    for name, workspace, role, archived in [("owner", "a", "owner", None), ("other", "b", "owner", None), ("member", "a", "member", None), ("readonly", "readonly", "owner", None), ("expired", "expired", "owner", None), ("archived", "a", "member", timestamp)]:
        password = secrets.token_urlsafe(24)
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000, 32)
        email = name + "@baseline.invalid"
        db.execute("INSERT INTO users VALUES(?,?,?,?,?,?,?)", (name, email, name, base64.b64encode(digest).decode(), base64.b64encode(salt).decode(), timestamp, timestamp))
        db.execute("INSERT INTO memberships(id,workspace_id,user_id,role,created_at,archived_at) VALUES(?,?,?,?,?,?)", (name, workspace, name, role, timestamp, archived))
        accounts[name] = {"email": email, "password": password}
    for workspace, count in [("a", 1000), ("b", 25)]:
        for index in range(count):
            db.execute("INSERT INTO k9_roster(id,dog_name,workspace_id,created_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?)", (f"{workspace}-dog-{index:04}", f"Synthetic Dog {index:04}", workspace, "owner" if workspace == "a" else "other", timestamp, timestamp))
    db.commit()
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    db.close()
    (SANDBOX / "accounts.json").write_text(json.dumps(accounts), encoding="utf-8")
    print("Prepared synthetic-only sandbox:", SANDBOX)
    print("1025 dogs; two active tenants; active member, archived member, read-only and expired owners.")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Redirects forbidden in local regression tests")


def test():
    config = (SANDBOX / "wrangler.toml").read_text(encoding="utf-8")
    assert 'remote = false' in config
    assert (SANDBOX / ".dev.vars").read_text(encoding="utf-8") == 'LOCAL_DEV_FULL_ACCESS=false\nAPP_URL=http://127.0.0.1:8791\n'
    startup = (SANDBOX / "server.stdout.log").read_text(encoding="utf-8", errors="replace")
    assert "Ready on http://127.0.0.1:8791" in startup
    assert "Using secrets defined in .dev.vars" in startup
    assert not any(name in startup for name in ["env.PADDLE_", "env.RESEND_", "env.DEV_SECRET_PASS"]), "External credentials detected; stop the server before testing"
    assert any("env.DB" in line and "local" in line for line in startup.splitlines())
    for original in (ROOT / "functions").rglob("*.ts"):
        copied = SANDBOX / "functions" / original.relative_to(ROOT / "functions")
        assert copied.read_bytes() == original.read_bytes(), "Sandbox Functions are stale; prepare a fresh sandbox before comparison"
    accounts = json.loads((SANDBOX / "accounts.json").read_text(encoding="utf-8"))
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    cookies = {}
    checks = []

    def call(path, actor=None, method="GET", body=None, expected=200, origin=BASE):
        assert path.startswith("/api/") and not path.startswith("/api/billing/")
        headers = {"Origin": origin}
        if actor in cookies:
            headers["Cookie"] = cookies[actor]
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
        start = time.perf_counter()
        try:
            response = opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            elapsed = (time.perf_counter()-start)*1000
            assert response.code == expected, f"{method} {path}: expected {expected}, got {response.code}"
            assert response.headers.get("Cache-Control") == "no-store"
            if response.headers.get("Set-Cookie") and actor:
                cookies[actor] = response.headers["Set-Cookie"].split(";", 1)[0]
            return json.loads(raw), elapsed, len(raw)

    def check(label, condition):
        assert condition, label
        checks.append(label)

    call("/api/k9", expected=401)
    for actor in accounts:
        call("/api/auth/login", actor, "POST", accounts[actor], 401 if actor == "archived" else 200)
    call("/api/auth/login", method="POST", body={"email": accounts["owner"]["email"], "password": secrets.token_urlsafe()}, expected=401)
    check("valid/invalid/archived login", True)
    for actor in ["owner", "member", "readonly", "expired"]:
        session = call("/api/auth/session", actor)[0]["data"]
        check(actor + " subscription enforcement", session["subscription"]["writable"] == (actor in ["owner", "member"]))
        check(actor + " role permissions", session["permissions"]["edit"] == (actor == "owner"))
    owner_rows = call("/api/k9", "owner")[0]["data"]
    other_rows = call("/api/k9", "other")[0]["data"]
    check("tenant list isolation", len(owner_rows) == 1000 and len(other_rows) == 25 and all(x["workspace_id"] == "a" for x in owner_rows) and all(x["workspace_id"] == "b" for x in other_rows))
    call("/api/k9/a-dog-0000", "other", expected=404)
    call("/api/k9/a-dog-0000", "other", "PUT", {"dog_name": "Forbidden"}, 404)
    call("/api/k9/a-dog-0000", "other", "DELETE")
    check("cross-tenant read/update denied; delete is successful no-op", call("/api/k9/a-dog-0000", "owner")[0]["data"]["dog_name"] == "Synthetic Dog 0000")
    for actor in ["readonly", "expired"]:
        call("/api/k9", actor)
        call("/api/k9", actor, "POST", {"dog_name": "Forbidden"}, 403)
    call("/api/k9/a-dog-0000", "member", "PUT", {"dog_name": "Forbidden"}, 403)
    call("/api/k9/a-dog-0000", "member", "DELETE", expected=403)
    call("/api/handlers", "member", "POST", {}, 403)
    call("/api/members", "member", expected=403)
    call("/api/k9", "owner", "POST", {"dog_name": "Forbidden"}, 403, "https://untrusted.invalid")
    check("read-only/member/origin guards", True)
    dog = call("/api/k9", "member", "POST", {"dog_name": "Temporary synthetic dog"}, 201)[0]["data"]["id"]
    call(f"/api/k9/{dog}", "owner", "PUT", {"dog_name": "Updated synthetic dog"})
    check("K9 create/update/read", call(f"/api/k9/{dog}", "owner")[0]["data"]["dog_name"] == "Updated synthetic dog")
    call(f"/api/k9/{dog}", "owner", "DELETE")
    call(f"/api/k9/{dog}", "owner", expected=404)
    stay = {"k9_id": "a-dog-0000", "owner_name": "Synthetic", "check_in_date": "2026-01-01", "check_out_date": "2026-01-03", "status": "Checked Out", "currency": "USD", "price_per_day": 12.5}
    call("/api/boarding", "other", "POST", stay, 400)
    saved = call("/api/boarding", "owner", "POST", stay, 201)[0]["data"]
    check("boarding inclusive-day pricing", saved["total_amount"] == 37.5)
    page = call("/api/boarding?limit=1&offset=0", "owner")[0]
    check("boarding pagination contract", len(page["data"]) == 1 and page["total"] == 1)
    call("/api/boarding/" + saved["id"], "owner", "DELETE")
    for weight, date in [(25, "2026-01-01"), (27.5, "2026-01-02")]:
        call("/api/weights", "owner", "POST", {"date": date, "entries": [{"dog_id": "a-dog-0000", "weight": weight}]}, 201)
    weights = call("/api/weights?limit=10", "owner")[0]
    check("weight stored difference", weights["total"] == 2 and weights["data"][0]["difference"] == 2.5 and weights["data"][1]["difference"] is None)
    for row in weights["data"]:
        call("/api/weights/" + row["id"], "owner", "DELETE")
    metrics = []
    for path in ["/api/auth/session", "/api/k9", "/api/boarding?limit=10", "/api/weights?limit=10", "/api/feeding?limit=10", "/api/training/obedience?limit=10", "/api/medical/records?limit=10"]:
        call(path, "owner")
        samples = [call(path, "owner") for _ in range(30)]
        times = sorted(item[1] for item in samples)
        metrics.append({"path": path, "samples": 30, "median_ms": round(statistics.median(times), 2), "p95_ms": round(times[math.ceil(.95*len(times))-1], 2), "response_bytes": samples[0][2]})
    call("/api/auth/logout", "owner", "POST", {})
    call("/api/auth/session", "owner", expected=401)
    check("logout invalidates session", True)
    report = {"timestamp": datetime.now(timezone.utc).isoformat(), "checks": checks, "metrics": metrics, "limitations": "Localhost, sequential warm requests; 1000 synthetic dogs without photos. Other measured lists empty. Not browser or production performance; no billing calls."}
    output = SANDBOX / ("result-" + str(time.time_ns()) + ".json")
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("RESULT", output)


if __name__ == "__main__":
    if sys.argv[1:] == ["prepare"]:
        prepare()
    elif sys.argv[1:] == ["test"]:
        test()
    else:
        raise SystemExit("Usage: python -B scripts/baseline-api.py prepare|test")