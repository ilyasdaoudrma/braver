"""D1 fix: Aegis "Suicide and Self Harm" is a conversation-level category, so some prompts labelled danger are
harmless on their own ("Okay, I can respect that."). This script asks qwen/qwen3.8-27b, with the BRAVER danger
definition, whether each Aegis danger prompt shows danger BY ITSELF. split.py drops the groups (and their
translations) the check rejects. Nothing is flipped to "no danger": the context is unknown.

Output: data/interim/aegis_check.csv (id, keep)
Usage: ml/.venv/Scripts/python -I ml/safety/check_aegis.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.groq_client import GroqJSON  # noqa: E402

INTERIM = HERE / "data" / "interim"
CACHE = HERE / "data" / "cache" / "check_aegis"
MODEL = "qwen/qwen3.8-27b"
BATCH = 20

SYSTEM = """You check labels for a suicide-prevention safety filter. For each message, answer danger=true ONLY if the
message ON ITS OWN shows that the writer is in danger: suicidal thoughts or plans, wish to be dead, self-harm (including
asking how to hurt or kill oneself), violence the writer is suffering, or immediate danger to the writer.
Answer false for messages that are harmless on their own, for violence the writer wants to do to others, and for
general questions about suicide that do not concern the writer. Answer for every id."""

ITEM = {"type": "object", "properties": {"id": {"type": "string"}, "danger": {"type": "boolean"}}, "required": ["id", "danger"], "additionalProperties": False}
SCHEMA = {"type": "object", "properties": {"items": {"type": "array", "items": ITEM}}, "required": ["items"], "additionalProperties": False}


def main() -> None:
    english = pd.read_csv(INTERIM / "english.csv")
    rows = english[english["origin"].str.startswith("nvidia") & (english["label"] == 1)]
    client = GroqJSON(CACHE)
    keep: dict[str, bool] = {}
    records = list(zip(rows["id"], rows["text"]))
    for start in range(0, len(records), BATCH):
        batch = records[start : start + BATCH]
        user = "\n".join(f"{rid}: {text}" for rid, text in batch)
        data = client.ask(MODEL, SYSTEM, user, SCHEMA, "checks", max_tokens=1200, temperature=0.0)
        for it in (data or {}).get("items", []):
            keep[it["id"]] = bool(it["danger"])
        print(f"{min(start + BATCH, len(records))}/{len(records)} calls={client.calls} cached={client.cached}", flush=True)
    out = pd.DataFrame({"id": rows["id"], "keep": rows["id"].map(keep)})
    missing = int(out["keep"].isna().sum())
    out["keep"] = out["keep"].fillna(False).astype(bool)  # unchecked rows are dropped (safer than keeping noise)
    out.to_csv(INTERIM / "aegis_check.csv", index=False, encoding="utf-8", lineterminator="\n")
    print(f"kept {int(out['keep'].sum())}/{len(out)} Aegis danger prompts, {missing} without an answer (dropped)")


if __name__ == "__main__":
    main()
