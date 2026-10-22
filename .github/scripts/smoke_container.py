#!/usr/bin/env python3
"""Check a built image with Compose settings and a temporary localhost container."""
import argparse
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[2]
HTTP = build_opener(ProxyHandler({}))


def docker(*args, **kwargs):
    return subprocess.check_output(
        ["docker", *args], text=True, timeout=60, cwd=ROOT, **kwargs).strip()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("src", "href") and value and value.startswith("/assets/"):
                self.paths.add(value)


def fetch(base, path):
    with HTTP.open(base + path, timeout=2) as response:
        return response.read().decode(), response.headers


def check_image(image, esplora):
    expected = {
        "VITE_API_BASE_URL": "https://api.example.test",
        "VITE_ESPLORA_BASE_URL": esplora,
        "VITE_KEYCLOAK_URL": "https://auth.example.test",
        "VITE_KEYCLOAK_REALM": "smoke-test",
        "VITE_KEYCLOAK_CLIENT_ID": "dashboard",
        "VITE_API_MOCKING_ENABLED": "false",
        "VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING": "false",
    }
    compose = json.loads(docker(
        "compose", "--env-file", ".env.example", "config", "--format", "json",
        env=dict(os.environ, **expected)))
    environment = compose["services"]["app"]["environment"]
    for key, value in expected.items():
        require(environment.get(key) == value, f"Compose did not forward {key}")
    args = ["run", "--detach", "--rm", "--publish", "127.0.0.1::80"]
    for key in expected:
        args.extend(["--env", f"{key}={environment[key]}"])
    container = docker(*args, image)
    try:
        details = json.loads(docker("inspect", container))[0]
        port = details["NetworkSettings"]["Ports"]["80/tcp"][0]["HostPort"]
        base = f"http://127.0.0.1:{port}"
        deadline = time.monotonic() + 30
        while True:
            try:
                html, _ = fetch(base, "/")
                break
            except (URLError, TimeoutError, ConnectionError):
                if time.monotonic() >= deadline:
                    raise RuntimeError("nginx did not become ready within 30 seconds")
                time.sleep(0.5)

        docker("exec", container, "nginx", "-t")
        require('<div id="root">' in html, "The app HTML was not served")
        require('/config.js' in html, "The app does not load runtime configuration")
        spa, _ = fetch(base, "/smoke-test/nested-route")
        require(spa == html, "SPA routing did not fall back to index.html")
        config, headers = fetch(base, "/config.js")
        require("no-store" in headers.get("Cache-Control", ""),
                "Runtime configuration must not be cached")
        prefix = "window.__ENV__ = "
        require(config.startswith(prefix) and config.strip().endswith(";"),
                "config.js did not assign window.__ENV__")
        actual = json.loads(config[len(prefix):].strip().removesuffix(";"))
        for key, value in expected.items():
            require(actual.get(key) == value, f"Runtime configuration lost {key}")

        assets = Assets()
        assets.feed(html)
        require(any(path.endswith(".js") for path in assets.paths),
                "No built JavaScript asset found in index.html")
        for path in sorted(assets.paths):
            body, headers = fetch(base, path)
            require(body and "text/html" not in headers.get("Content-Type", ""),
                    f"Static asset was missing or served HTML: {path}")
        print(f"PASS: nginx, SPA, assets, runtime config (Esplora={esplora!r})")
    except Exception:
        print(docker("logs", container))
        raise
    finally:
        subprocess.run(["docker", "rm", "--force", container], check=True,
                       stdout=subprocess.DEVNULL, timeout=30)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", help="Local Docker image to test; no image is published")
    options = parser.parse_args()
    check_image(options.image, "https://explorer.example.test/custom")
    check_image(options.image, "")
