"""D1 step 1: download the public safety sources into ml/safety/data/raw/ (git-ignored).

Sources (licences checked on the dataset cards, 20 Nov 2026):
- vibhorag101/suicide_prediction_dataset_phr  (MIT)        English Reddit, suicide / non-suicide
- nvidia/Aegis-AI-Content-Safety-Dataset-2.0  (CC-BY-4.0)  "Suicide and Self Harm" prompts + safe prompts
Skipped: jquiros/suicide (no licence on the card).

Usage: ml/.venv/Scripts/python -I ml/safety/download.py
Needs HF_TOKEN in the environment or in braver/.env.local.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from huggingface_hub import hf_hub_download

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(__file__).resolve().parent / "data" / "raw"

FILES = {
    "vibhorag101/suicide_prediction_dataset_phr": [
        "data/train-00000-of-00001-2ab36d8ba3acdbcd.parquet",
        "data/test-00000-of-00001-a1bf8c09fedae1d2.parquet",
    ],
    "nvidia/Aegis-AI-Content-Safety-Dataset-2.0": ["train.json", "validation.json", "test.json"],
}


def load_token() -> str | None:
    token = os.environ.get("HF_TOKEN")
    env = ROOT / ".env.local"
    if not token and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("HF_TOKEN="):
                token = line.split("=", 1)[1].strip().strip('"')
    return token


def main() -> None:
    token = load_token()
    for repo, files in FILES.items():
        dest = RAW / repo.split("/")[1]
        dest.mkdir(parents=True, exist_ok=True)
        for name in files:
            target = dest / Path(name).name
            if target.exists():
                print(f"cached  {target.relative_to(ROOT)}")
                continue
            path = hf_hub_download(repo, name, repo_type="dataset", token=token)
            shutil.copyfile(path, target)
            print(f"saved   {target.relative_to(ROOT)} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
