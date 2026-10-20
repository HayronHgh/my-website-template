import copy
import hashlib
import hmac
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import subprocess
import threading
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "cd_webhook", Path(__file__).resolve().parents[1] / "ops/macmini/cd-webhook.py")
webhook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(webhook)
REPO = "HayronHgh/my-website-template"
SECRET = b"test-only-secret-not-used-in-production"
COMMIT = "a" * 40


def payload():
    return {"action": "completed", "repository": {"full_name": REPO}, "workflow_run": {
        "id": 123, "status": "completed", "conclusion": "success", "event": "push",
        "head_branch": "main", "head_sha": COMMIT, "name": "CI",
        "path": ".github/workflows/ci.yml", "head_repository": {"full_name": REPO}}}


class WebhookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = {"repository": REPO, "root": self.temp.name}
        self.deployer = webhook.Deployer(self.config)

    def test_hmac_requires_exact_raw_body_and_sha256(self):
        body = b'{"text":"hello"}'
        signature = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        self.assertTrue(webhook.valid_signature(SECRET, body, signature))
        for bad in (None, "", "sha1=abc", signature[:-1]):
            self.assertFalse(webhook.valid_signature(SECRET, body, bad))
        self.assertFalse(webhook.valid_signature(SECRET, body + b" ", signature))

    def test_only_successful_main_push_ci_is_eligible(self):
        good = payload()
        self.assertIsNotNone(webhook.eligible_run(good, self.config))
        for field, value in (("head_branch", "dev"), ("event", "pull_request"),
                             ("conclusion", "failure"), ("status", "in_progress"),
                             ("name", "Other"), ("path", ".github/workflows/other.yml"),
                             ("id", "123"), ("head_sha", "main;echo unsafe"),
                             ("head_repository", {"full_name": "someone/fork"})):
            changed = copy.deepcopy(good)
            changed["workflow_run"][field] = value
            self.assertIsNone(webhook.eligible_run(changed, self.config), field)
        good["repository"]["full_name"] = "other/repo"
        self.assertIsNone(webhook.eligible_run(good, self.config))

    def test_queue_deduplicates_delivery_and_commit_and_survives_restart(self):
        run = payload()["workflow_run"]
        self.assertEqual(self.deployer.enqueue("delivery-1", run), "queued")
        self.assertEqual(self.deployer.enqueue("delivery-1", run), "duplicate")
        self.assertEqual(self.deployer.enqueue("delivery-2", run), "duplicate")
        restarted = webhook.Deployer(self.config)
        with patch.object(restarted, "deploy", return_value="success") as deploy:
            self.assertTrue(restarted.work_once())
            self.assertFalse(restarted.work_once())
            deploy.assert_called_once_with(COMMIT, 123)

    def test_crash_recovery_requeues_inflight_jobs(self):
        self.deployer.enqueue("delivery-1", payload()["workflow_run"])
        with self.deployer.connect() as db:
            db.execute("UPDATE jobs SET status='deploying'")
        restarted = webhook.Deployer(self.config)
        with patch.object(restarted, "deploy", return_value="success"):
            self.assertTrue(restarted.work_once())

    def test_api_rechecks_ci_and_rejects_outdated_commits_before_execution(self):
        with patch.object(self.deployer, "github", side_effect=[payload()["workflow_run"],
                          {"object": {"sha": "b" * 40}}]), patch.object(webhook.subprocess, "Popen") as process:
            self.assertEqual(self.deployer.deploy(COMMIT, 123), "skipped")
            process.assert_not_called()
        bad = payload()["workflow_run"]
        bad["conclusion"] = "failure"
        with patch.object(self.deployer, "github", return_value=bad), patch.object(webhook.subprocess, "Popen") as process:
            with self.assertRaises(RuntimeError):
                self.deployer.deploy(COMMIT, 123)
            process.assert_not_called()

    def test_failure_is_recorded_and_retried_not_marked_success(self):
        self.deployer.enqueue("delivery-1", payload()["workflow_run"])
        with patch.object(self.deployer, "deploy", side_effect=RuntimeError("test failure")), \
                self.assertLogs(level="ERROR"):
            self.deployer.work_once()
        with self.deployer.connect() as db:
            status, attempts, error = db.execute("SELECT status,attempts,error FROM jobs").fetchone()
        self.assertEqual((status, attempts), ("retry", 1))
        self.assertIn("test failure", error)

    def test_http_signature_ping_ignored_events_and_queued_delivery(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), webhook.make_handler(self.deployer, SECRET))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        def request(data, event="workflow_run", signed=True):
            body = json.dumps(data).encode()
            headers = {"Content-Type": "application/json", "X-GitHub-Event": event,
                       "X-GitHub-Delivery": "http-delivery"}
            if signed:
                headers["X-Hub-Signature-256"] = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
            connection = HTTPConnection(*server.server_address, timeout=3)
            connection.request("POST", "/github/webhook", body, headers)
            response = connection.getresponse()
            result = (response.status, json.loads(response.read())["status"])
            connection.close()
            return result

        self.assertEqual(request(payload(), signed=False), (401, "invalid_signature"))
        self.assertEqual(request({}, event="ping"), (200, "pong"))
        self.assertEqual(request({}, event="push"), (202, "ignored"))
        bad = payload()
        bad["workflow_run"]["conclusion"] = "failure"
        self.assertEqual(request(bad), (202, "ignored"))
        self.assertEqual(request(payload()), (202, "queued"))
        self.assertEqual(request(payload()), (202, "duplicate"))
        self.assertEqual(request([]), (400, "invalid_payload"))

    @unittest.skipIf(os.name == "nt", "Requires POSIX bash (runs in Linux CI and on Mac)")
    def test_safe_script_rejects_branch_advance_before_build(self):
        root = Path(self.temp.name)
        (root / "scripts").mkdir()
        script = root / "scripts/cd-template-update-safe.sh"
        script.write_bytes((Path(__file__).resolve().parents[1] /
                            "ops/macmini/cd-template-update-safe.sh").read_bytes())
        tools = root / "bin"
        tools.mkdir()
        for name in ("docker", "rsync", "tar", "shasum", "curl"):
            stub = tools / name
            stub.write_text("#!/bin/sh\nexit 99\n")
            stub.chmod(0o700)
        git = tools / "git"
        git.write_text('#!/bin/sh\nif [ "$1" = ls-remote ]; then echo "' + "b" * 40 +
                       '\trefs/heads/main"; else exit 99; fi\n')
        git.chmod(0o700)
        env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"],
                   TEMPLATE_REPO="https://example.invalid/repo", EXPECTED_TEMPLATE_REV=COMMIT)
        result = subprocess.run(["/bin/bash", str(script)], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 7, result.stderr)
        self.assertIn("Branch moved after CI approval", result.stderr)
        self.assertFalse((root / ".cd/state/deploy.lock").exists())


if __name__ == "__main__":
    unittest.main()
