#!/usr/bin/env python3
"""Signed GitHub CI webhooks -> durable serial deployment queue (stdlib only)."""
import hashlib
from contextlib import contextmanager
import hmac
import json
import logging
import os
from pathlib import Path
import re
import signal
import sqlite3
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

MAX_BODY = 1024 * 1024
SHA = re.compile(r"[0-9a-f]{40}")
DELIVERY = re.compile(r"[a-zA-Z0-9-]{1,100}")


def valid_signature(secret, body, signature):
    expected = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    return isinstance(signature, str) and hmac.compare_digest(expected, signature)


def eligible_run(payload, config):
    """Reject PR/fork/tag/other workflow events, even when genuinely signed."""
    run = payload.get("workflow_run", {})
    if not isinstance(run, dict):
        return None
    if (payload.get("repository", {}).get("full_name") != config["repository"]
            or payload.get("action") != "completed"
            or run.get("status") != "completed" or run.get("conclusion") != "success"
            or run.get("event") != "push" or run.get("head_branch") != "main"
            or run.get("name") != "CI" or run.get("path") != ".github/workflows/ci.yml"
            or run.get("head_repository", {}).get("full_name") != config["repository"]
            or not isinstance(run.get("head_sha"), str) or not SHA.fullmatch(run["head_sha"])
            or type(run.get("id")) is not int or run["id"] <= 0):
        return None
    return run


class Deployer:
    def __init__(self, config):
        self.config = config
        self.root = Path(config["root"]).resolve()
        self.state = self.root / ".cd/webhook"
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.database = self.state / "queue.sqlite3"
        self.wakeup = threading.Event()
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, received REAL)")
            db.execute("""CREATE TABLE IF NOT EXISTS jobs (
                sha TEXT PRIMARY KEY, run_id INTEGER, status TEXT, attempts INTEGER DEFAULT 0,
                next_try REAL DEFAULT 0, updated REAL, error TEXT DEFAULT '')""")
            db.execute("UPDATE jobs SET status='pending' WHERE status='deploying'")

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(str(self.database), timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def enqueue(self, delivery, run):
        now = time.time()
        with self.connect() as db:
            db.execute("DELETE FROM deliveries WHERE received < ?", (now - 7 * 86400,))
            if db.execute("SELECT 1 FROM deliveries WHERE id=?", (delivery,)).fetchone():
                return "duplicate"
            db.execute("INSERT INTO deliveries VALUES (?,?)", (delivery, now))
            existing = db.execute("SELECT status FROM jobs WHERE sha=?", (run["head_sha"],)).fetchone()
            if existing and existing[0] not in ("failed", "skipped"):
                return "duplicate"
            db.execute("INSERT OR REPLACE INTO jobs (sha,run_id,status,updated) VALUES (?,?,?,?)",
                       (run["head_sha"], run["id"], "pending", now))
        self.wakeup.set()
        return "queued"

    def github(self, path):
        # Fixed origin/repository: never use URLs from webhook payloads. Public repo needs no PAT.
        request = Request("https://api.github.com/repos/" + self.config["repository"] + path,
                          headers={"Accept": "application/vnd.github+json",
                                   "User-Agent": "Hayron-MacMini-CD", "X-GitHub-Api-Version": "2022-11-28"})
        with urlopen(request, timeout=20) as response:
            return json.load(response)

    def deploy(self, sha, run_id):
        actual = self.github("/actions/runs/" + str(run_id))
        if not eligible_run({"action": "completed", "repository": {"full_name": self.config["repository"]},
                             "workflow_run": actual}, self.config) or actual["head_sha"] != sha:
            raise RuntimeError("GitHub API did not confirm successful main CI for this SHA")
        if self.github("/git/ref/heads/main")["object"]["sha"] != sha:
            return "skipped"  # Never deploy newer untested HEAD after an old delivery.
        deployed = self.root / ".cd/state/template-rev"
        if deployed.exists() and deployed.read_text().strip() == sha:
            self.healthcheck()
            return "success"
        env = dict(os.environ, EXPECTED_TEMPLATE_REV=sha)
        env["PATH"] = "/Applications/Docker.app/Contents/Resources/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        log_path = self.state / (sha + ".log")
        with log_path.open("ab") as log:
            process = subprocess.Popen(["/bin/bash", str(self.root / "scripts/cd-template-update-safe.sh")],
                                       cwd=str(self.root), env=env, stdout=log, stderr=subprocess.STDOUT,
                                       start_new_session=True)
            try:
                code = process.wait(timeout=1800)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                raise RuntimeError("Deployment exceeded 30 minute timeout")
        if code != 0:
            raise RuntimeError("Deployment exited " + str(code) + "; inspect " + log_path.name)
        if not deployed.exists() or deployed.read_text().strip() != sha:
            raise RuntimeError("Deployed revision did not match approved CI commit")
        self.healthcheck()
        return "success"

    def healthcheck(self):
        with urlopen("http://127.0.0.1:8080/projects", timeout=20) as response:
            if response.status != 200:
                raise RuntimeError("Post-deploy health check failed")

    def work_once(self):
        with self.connect() as db:
            job = db.execute("SELECT sha,run_id,attempts FROM jobs WHERE status IN ('pending','retry') "
                             "AND next_try <= ? ORDER BY updated DESC LIMIT 1", (time.time(),)).fetchone()
            if not job:
                return False
            sha, run_id, attempts = job
            db.execute("UPDATE jobs SET status='deploying', attempts=attempts+1, updated=? WHERE sha=?",
                       (time.time(), sha))
        error = ""
        try:
            status = self.deploy(sha, run_id)
        except Exception as exc:
            error = str(exc)
            status = "failed" if attempts >= 2 else "retry"
            logging.exception("Deployment failed for %s", sha)
        with self.connect() as db:
            db.execute("UPDATE jobs SET status=?, next_try=?, updated=?, error=? WHERE sha=?",
                       (status, time.time() + 60 * (2 ** attempts), time.time(), error, sha))
        logging.info("Deployment %s: %s", sha, status)
        return True

    def worker(self):
        while True:
            try:
                while self.work_once():
                    pass
            except Exception:
                logging.exception("Queue worker error")
            self.wakeup.wait(5)
            self.wakeup.clear()


def make_handler(deployer, secret):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def respond(self, code, status):
            body = json.dumps({"status": status}).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.respond(200 if self.path == "/github/webhook" else 404,
                         "ready" if self.path == "/github/webhook" else "not_found")

        def do_POST(self):
            if self.path != "/github/webhook":
                return self.respond(404, "not_found")
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if size <= 0 or size > MAX_BODY or self.headers.get("Transfer-Encoding"):
                    return self.respond(413, "invalid_size")
                body = self.rfile.read(size)
                if len(body) != size:
                    return self.respond(400, "incomplete_body")
                if not valid_signature(secret, body, self.headers.get("X-Hub-Signature-256")):
                    return self.respond(401, "invalid_signature")
                payload = json.loads(body)
                if not isinstance(payload, dict):
                    return self.respond(400, "invalid_payload")
                event = self.headers.get("X-GitHub-Event")
                if event == "ping":
                    return self.respond(200, "pong")
                if event != "workflow_run":
                    return self.respond(202, "ignored")
                run = eligible_run(payload, deployer.config)
                if not run:
                    return self.respond(202, "ignored")
                delivery = self.headers.get("X-GitHub-Delivery", "")
                if not DELIVERY.fullmatch(delivery):
                    return self.respond(400, "invalid_delivery")
                self.respond(202, deployer.enqueue(delivery, run))
            except (ValueError, TypeError, AttributeError):
                self.respond(400, "invalid_payload")
            except Exception:
                logging.exception("Webhook request failed")
                self.respond(503, "unavailable")

        def log_message(self, fmt, *args):
            logging.info("Webhook: " + fmt, *args)
    return Handler


def main():
    os.umask(0o077)
    config = json.loads(Path(sys.argv[1]).read_text())
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", config["repository"]):
        raise ValueError("Invalid repository configuration")
    secret = Path(config["secret_file"]).read_bytes().strip()
    if len(secret) < 32:
        raise ValueError("Use a random webhook secret of at least 32 bytes")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    deployer = Deployer(config)
    threading.Thread(target=deployer.worker, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", config.get("port", 9077)), make_handler(deployer, secret))
    server.daemon_threads = True
    logging.info("Signed webhook receiver ready on loopback")
    server.serve_forever()


if __name__ == "__main__":
    main()
