"""Small Groq client for the data scripts (translation, labelling, evaluation).

- strict json_schema output, validated by the caller
- disk cache (one JSON file per request hash) so every script is resumable
- reads x-ratelimit-* headers, sleeps on HTTP 429 (retry-after), retries 5xx / 400 a few times
Never used by the app (the app has lib/groq.ts). Scripts must use gpt-oss-120b or qwen, never the 20b.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[2]
URL = "https://api.groq.com/openai/v1/chat/completions"
SCRIPT_MODELS = ("openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-safeguard-20b")


def load_key() -> str:
    key = os.environ.get("GROQ_API_KEY")
    env = ROOT / ".env.local"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("GROQ_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        raise SystemExit("GROQ_API_KEY missing (env or .env.local)")
    return key


def _parse_seconds(value: str | None) -> float:
    """Groq reset headers look like '1m26.4s', '3.5s' or '450ms'."""
    if not value:
        return 0.0
    total, num = 0.0, ""
    i = 0
    while i < len(value):
        ch = value[i]
        if ch.isdigit() or ch == ".":
            num += ch
        elif value.startswith("ms", i):
            total += float(num or 0) / 1000
            num = ""
            i += 1
        elif ch in "hms":
            total += float(num or 0) * {"h": 3600, "m": 60, "s": 1}[ch]
            num = ""
        i += 1
    return total


class GroqJSON:
    def __init__(self, cache_dir: Path, log: bool = True) -> None:
        self.key = load_key()
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.log = log
        self.calls = 0
        self.cached = 0

    def _cache_path(self, payload: dict[str, Any]) -> Path:
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        return self.cache_dir / f"{digest[:32]}.json"

    def from_cache(
        self,
        model: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        name: str,
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> dict[str, Any] | None:
        """The cached answer of exactly this request, without calling the API."""
        path = self._cache_path(self._payload(model, system, user, schema, name, max_tokens, temperature))
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def _payload(
        self, model: str, system: str, user: str, schema: dict[str, Any], name: str, max_tokens: int, temperature: float
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "response_format": {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}},
            "temperature": temperature,
            "max_completion_tokens": max_tokens,
        }
        if model.startswith("openai/"):
            payload["reasoning_effort"] = "low"
            payload["include_reasoning"] = False
        else:
            payload["reasoning_effort"] = "none"
        return payload

    def ask(
        self,
        model: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        name: str,
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> dict[str, Any] | None:
        if model not in SCRIPT_MODELS:
            raise ValueError(f"scripts must not use {model} (keep the 20b quota for the app)")
        payload = self._payload(model, system, user, schema, name, max_tokens, temperature)
        path = self._cache_path(payload)
        if path.exists():
            self.cached += 1
            return json.loads(path.read_text(encoding="utf-8"))

        attempt = 0
        waits = 0
        while attempt < 6 and waits < 60:
            attempt += 1
            try:
                res = requests.post(
                    URL, headers={"Authorization": f"Bearer {self.key}"}, json=payload, timeout=90
                )
            except requests.RequestException as exc:
                self._say(f"  network error {exc!s:.80}, retry")
                time.sleep(5)
                continue
            if res.status_code == 429:
                wait = float(res.headers.get("retry-after") or 0) or _parse_seconds(
                    res.headers.get("x-ratelimit-reset-tokens")
                ) or 20
                low = res.text.lower()
                if "per day" in low or "rpd" in low or "tpd" in low:
                    raise SystemExit(f"daily request limit reached on {model}: {res.text[:200]}")
                self._say(f"  429 on {model}, sleeping {wait:.1f}s: {res.text[:220]}")
                time.sleep(min(wait, 120) + 1)  # never trust a huge retry-after blindly
                attempt -= 1  # a rate-limit wait is not a failed attempt
                waits += 1
                continue
            if res.status_code >= 400:
                self._say(f"  HTTP {res.status_code} on {model}: {res.text[:160]}")
                time.sleep(3 * (attempt + 1))
                continue
            self.calls += 1
            body = res.json()
            content = body["choices"][0]["message"].get("content") or ""
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                self._say("  invalid JSON, retry")
                continue
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            tmp.replace(path)  # atomic: a killed run never leaves a truncated cache file
            # The token bucket refills continuously: wait only for the share we are missing.
            remaining = res.headers.get("x-ratelimit-remaining-tokens")
            per_minute = int(res.headers.get("x-ratelimit-limit-tokens") or 8000)
            need = max_tokens + 1000
            if remaining is not None and int(remaining) < need:
                time.sleep((need - int(remaining)) / per_minute * 60)
            return data
        return None

    def _say(self, msg: str) -> None:
        if self.log:
            print(msg, flush=True)
