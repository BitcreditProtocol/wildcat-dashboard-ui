#!/usr/bin/env python3
"""Regressions for container startup diagnostics and binary asset requests."""
import json
import subprocess
import unittest
from unittest.mock import MagicMock, patch

import smoke_container as smoke


class SmokeContainerTests(unittest.TestCase):
    def test_fetch_preserves_binary_assets(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b"\x89PNG\r\n\xff\x00"
        with patch.object(smoke.HTTP, "open", return_value=response):
            body, _ = smoke.fetch("http://127.0.0.1", "/assets/icon.png")
        self.assertEqual(body, b"\x89PNG\r\n\xff\x00")

    def test_startup_failure_keeps_logs_and_original_error(self):
        def docker(*args, **kwargs):
            if args[0] == "compose":
                return json.dumps({"services": {"app": {"environment": kwargs["env"]}}})
            if args[0] == "run":
                self.assertNotIn("--rm", args)
                return "test-container"
            if args[0] == "inspect":
                return json.dumps([{"State": {"Running": False, "ExitCode": 42}}])
            self.fail(f"Unexpected Docker call: {args}")

        # Even failed log retrieval must not replace the startup error.
        with patch.object(smoke, "docker", side_effect=docker), \
                patch.object(smoke.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)) as run:
            with self.assertRaisesRegex(RuntimeError, "exited during startup.*42"):
                smoke.check_image("broken-image", "")
        self.assertEqual(run.call_args_list[0].args[0], ["docker", "logs", "test-container"])
        self.assertFalse(run.call_args_list[0].kwargs["check"])
        self.assertEqual(run.call_args_list[1].args[0], ["docker", "rm", "--force", "test-container"])


if __name__ == "__main__":
    unittest.main()
