#!/usr/bin/env python3
"""Check deployment and PR-container workflows independently of nightly publishing."""
import json
import os
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


def workflow(name):
    return json.loads(subprocess.check_output(
        ["yq", "-o=json", ".", str(ROOT / ".github/workflows" / name)], text=True))


CI = workflow("ci.yml")
DEPLOY = workflow("deploy.yml")


class DeploymentGateTests(unittest.TestCase):
    def test_new_deployments_cancel_older_runs_including_ci(self):
        self.assertEqual(DEPLOY["concurrency"]["group"], "deploy-${{ github.ref }}")
        self.assertTrue(DEPLOY["concurrency"]["cancel-in-progress"])

    def test_invalid_dispatches_fail_before_ci(self):
        self.assertEqual(DEPLOY["jobs"]["ci"]["needs"], "validate-target")
        preflight = DEPLOY["jobs"]["validate-target"]
        self.assertNotIn("secrets.", json.dumps(preflight))
        step = preflight["steps"][0]
        cases = [
            ("push", "", "branch", "refs/heads/master", True),
            ("workflow_dispatch", "dev", "branch", "refs/heads/dev", True),
            ("workflow_dispatch", "dev", "branch", "refs/heads/master", False),
            ("workflow_dispatch", "dev", "tag", "refs/tags/dev", False),
            ("workflow_dispatch", "staging", "tag", "refs/tags/v1.0.0", True),
            ("workflow_dispatch", "production", "tag", "refs/tags/v1.0.0", True),
            ("workflow_dispatch", "staging", "branch", "refs/heads/dev", False),
            ("workflow_dispatch", "production", "branch", "refs/heads/master", False),
            ("workflow_dispatch", "unknown", "tag", "refs/tags/v1.0.0", False),
        ]
        for event, target, ref_type, ref, allowed in cases:
            with self.subTest(event=event, target=target, ref=ref):
                result = subprocess.run(["bash", "-c", step["run"]], capture_output=True,
                                        env=dict(os.environ, GITHUB_EVENT_NAME=event,
                                                 DEPLOY_ENVIRONMENT=target,
                                                 GITHUB_REF_TYPE=ref_type, GITHUB_REF=ref))
                self.assertEqual(result.returncode == 0, allowed)

    def test_docker_and_development_use_the_same_node_major(self):
        major = (ROOT / ".nvmrc").read_text().strip()
        self.assertRegex(major, r"^\d+$")
        docker_major = re.search(r"^FROM node:(\d+)[-@]", (ROOT / "Dockerfile").read_text(), re.M)
        self.assertIsNotNone(docker_major)
        self.assertEqual(docker_major.group(1), major)

    def test_every_deployment_requires_ci_for_the_same_commit(self):
        jobs = DEPLOY["jobs"]
        self.assertEqual(jobs["ci"]["uses"], "./.github/workflows/ci.yml")
        self.assertEqual(jobs["ci"]["permissions"], {"contents": "read"})
        self.assertNotIn("secrets", jobs["ci"])
        for name, job in jobs.items():
            if not name.startswith("deploy-"):
                continue
            with self.subTest(job=name):
                dependencies = job["needs"]
                if isinstance(dependencies, str):
                    dependencies = [dependencies]
                self.assertIn("ci", dependencies)
                # Status functions could bypass the default success() dependency gate.
                for override in ("always(", "failure(", "cancelled("):
                    self.assertNotIn(override, job.get("if", ""))
                checkout = next(s for s in job["steps"]
                                if s.get("uses", "").startswith("actions/checkout@"))
                self.assertEqual(checkout["with"]["ref"], "${{ github.sha }}")

    def test_prs_build_and_smoke_test_without_publishing(self):
        self.assertIn("workflow_call", CI["on"])
        self.assertIsNone(CI["on"]["pull_request"])
        self.assertEqual(CI["permissions"], {"contents": "read"})
        self.assertNotIn("concurrency", CI)
        for job in CI["jobs"].values():
            self.assertNotIn("if", job)
            checkout = next(s for s in job["steps"]
                            if s.get("uses", "").startswith("actions/checkout@"))
            self.assertEqual(checkout["with"]["ref"], "${{ github.sha }}")
        container = CI["jobs"]["container"]
        self.assertNotIn("secrets.", json.dumps(container))
        self.assertNotIn("docker/login-action", json.dumps(container))
        build = next(s for s in container["steps"]
                     if s.get("uses", "").startswith("docker/build-push-action@"))
        self.assertFalse(build["with"]["push"])
        self.assertTrue(build["with"]["load"])
        self.assertFalse(build.get("continue-on-error", False))
        smoke = next(s for s in container["steps"]
                     if ".github/scripts/smoke_container.py" in s.get("run", ""))
        self.assertFalse(smoke.get("continue-on-error", False))
        self.assertIn(build["with"]["tags"], smoke["run"])



if __name__ == "__main__":
    unittest.main()
