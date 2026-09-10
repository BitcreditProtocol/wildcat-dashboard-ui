#!/usr/bin/env python3
"""Exercise the actual nightly guard and image-recording step without publishing."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = json.loads(subprocess.check_output(
    ["yq", "-o=json", ".", str(ROOT / "workflows/nightly.yml")], text=True))


BUILD = json.loads(subprocess.check_output(
    ["yq", "-o=json", ".", str(ROOT / "workflows/build-image.yml")], text=True))


class NightlyTests(unittest.TestCase):
    def test_exact_source_guard_rejects_moved_master_and_invalid_inputs(self):
        step = next(s for s in BUILD["jobs"]["build"]["steps"]
                    if s.get("name") == "Verify candidate source")
        baseline = dict(os.environ, GITHUB_REF="refs/heads/master", GITHUB_SHA="a" * 40,
                        GITHUB_EVENT_NAME="workflow_dispatch", EXPECTED_SHA="a" * 40,
                        CANDIDATE_RUN_ID="123")
        for changes, expected in (({}, 0), ({"EXPECTED_SHA": "b" * 40}, 1),
                                  ({"EXPECTED_SHA": ""}, 1), ({"CANDIDATE_RUN_ID": "bad"}, 1),
                                  ({"GITHUB_REF": "refs/heads/dev"}, 1),
                                  ({"GITHUB_EVENT_NAME": "push", "EXPECTED_SHA": "",
                                    "CANDIDATE_RUN_ID": ""}, 0)):
            with self.subTest(changes=changes):
                result = subprocess.run(["bash", "-c", step["run"]], env=dict(baseline, **changes),
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode == 0, expected == 0)

    def test_records_both_registries_from_source_specific_tags(self):
        steps = BUILD["jobs"]["build"]["steps"]
        record = next(s for s in steps if s.get("id") == "resolved")
        code = record["run"].split("\n", 1)[1].rsplit("PY_IMAGE", 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            previous = Path.cwd()
            try:
                os.chdir(directory)
                env = dict(os.environ, GITHUB_SHA="a" * 40, GITHUB_RUN_ID="123",
                           GITHUB_RUN_ATTEMPT="2", GITHUB_REPOSITORY="Example/Wildcat",
                           GITHUB_REPOSITORY_OWNER="Example", IMAGE_NAME="core",
                           GAR_PATH="registry.example/project", GITHUB_OUTPUT="outputs",
                           CANDIDATE_RUN_ID="456")
                with patch.dict(os.environ, env, clear=True), patch("subprocess.check_output") as inspect:
                    inspect.side_effect = [json.dumps({"digest": "sha256:" + d * 64}) for d in "b"]
                    exec(compile(code, "nightly image record", "exec"), {})
                    result = json.loads(Path("nightly-image.json").read_text())
                    self.assertEqual(result["sha"], "a" * 40)
                    self.assertEqual(result["candidate_run_id"], "456")
                    self.assertEqual(result["run_attempt"], 2)
                    self.assertEqual(result["references"], {
                        "ghcr": "ghcr.io/example/core@sha256:" + "b" * 64})
                    for call in inspect.call_args_list:
                        self.assertIn(":source-" + "a" * 40 + "-123-2", call.args[0][4])
                    for bad in ({}, {"digest": "nightly"}, {"digest": None}):
                        Path("nightly-image.json").unlink()
                        inspect.side_effect = None
                        inspect.return_value = json.dumps(bad)
                        with self.assertRaises(SystemExit):
                            exec(compile(code, "invalid image record", "exec"), {})
                        self.assertFalse(Path("nightly-image.json").exists())
                        Path("nightly-image.json").write_text("placeholder")
            finally:
                os.chdir(previous)

    def test_prs_cannot_publish_and_dispatch_cannot_skip_matrix(self):
        jobs = WORKFLOW["jobs"]
        self.assertEqual(jobs["test"]["permissions"], {"contents": "read"})
        self.assertNotIn("secrets.", json.dumps(jobs["test"]))
        self.assertEqual(jobs["nightly"]["if"], "github.event_name != 'pull_request'")
        self.assertEqual(jobs["nightly"]["needs"], "test")
        self.assertTrue(jobs["nightly"]["with"]["record_nightly"])
        self.assertFalse(BUILD["on"]["workflow_call"]["inputs"]["record_nightly"]["default"])
        self.assertEqual(WORKFLOW["on"]["push"]["branches"], ["master"])
        self.assertEqual(BUILD["env"]["IMAGE_NAME"], 'bcr-wdc-dashboard-ui')
        save = next(s for s in BUILD["jobs"]["build"]["steps"] if s.get("name") == "Save the image result")
        self.assertEqual(save["with"]["retention-days"], 90)
        self.assertEqual(save["with"]["if-no-files-found"], "error")
        self.assertIn("github.run_attempt", save["with"]["name"])
        self.assertIn("inputs.candidate_run_id", WORKFLOW["concurrency"]["group"])


if __name__ == "__main__":
    unittest.main()
