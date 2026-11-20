"""Human check of 100 zone labels: compare `human_label` in data/to_check_100.csv with the AI labels.

Ilyas filled `human_label` on 20 Nov. The AI columns (label_qwen, label_safeguard, claude_label) were visible
while he labelled, so this is a human check with the AI labels shown, not a blind annotation.

Writes results/human_check.json (agreement + Cohen's kappa per AI labeller, disagreements with their split).
Usage: ml/.venv/Scripts/python -I -X utf8 ml/zones/human_check.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

HERE = Path(__file__).resolve().parent
CHECK = HERE / "data" / "to_check_100.csv"
SPLITS = HERE / "data" / "splits"
OUT = HERE / "results" / "human_check.json"
ZONES = ("scenario", "action", "acceptation")
AI_COLUMNS = {"qwen": "label_qwen", "safeguard": "label_safeguard", "claude": "claude_label"}


def compare(df: pd.DataFrame) -> dict:
    """Agreement and kappa of `human_label` against each AI column, on rows where both labels are valid zones."""
    human = df["human_label"].fillna("").str.strip().str.lower()
    invalid = df.loc[(human != "") & ~human.isin(ZONES), "group"].tolist()
    if invalid:
        raise ValueError(f"human_label must be one of {ZONES}; invalid in groups {invalid}")
    out: dict = {"n_filled": int((human != "").sum())}
    for name, col in AI_COLUMNS.items():
        ai = df[col].fillna("").str.strip().str.lower()
        both = human.isin(ZONES) & ai.isin(ZONES)
        h, a = human[both], ai[both]
        out[name] = {
            "n": int(both.sum()),
            "agree": int((h == a).sum()),
            "agreement": float((h == a).mean()) if both.any() else None,
            "kappa": float(cohen_kappa_score(h, a)) if both.any() else None,
        }
    return out


def split_of(groups: set[str]) -> dict[str, str]:
    where: dict[str, str] = {}
    for name in ("train", "val", "test"):
        s = pd.read_csv(SPLITS / f"{name}.csv", usecols=["group"])
        for g in set(s["group"]) & groups:
            where[g] = name
    return where


def main() -> None:
    df = pd.read_csv(CHECK, dtype=str, keep_default_na=False)
    result = compare(df)
    human = df["human_label"].str.strip().str.lower()
    dis = df[human.isin(ZONES) & (human != df["label_qwen"].str.strip().str.lower())]
    where = split_of(set(dis["group"]))
    report = {
        "what": "Zone labels of the 100 worries in to_check_100.csv checked by a person (Ilyas, 20 Nov). "
        "The AI labels (qwen, safeguard, Claude) were visible while he labelled: a human check with AI labels shown, not a blind annotation.",
        "checked_by": "human (Ilyas)",
        "blind": False,
        **result,
        "disagreements_with_qwen": [
            {"group": r.group, "qwen": r.label_qwen, "claude": r.claude_label, "human": r.human_label.strip().lower(),
             "split": where.get(r.group, "none"), "fr": r.fr}
            for r in dis.itertuples()
        ],
    }
    report["disagreements_in_test"] = sum(d["split"] == "test" for d in report["disagreements_with_qwen"])
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    q = result["qwen"]
    print(f"human vs qwen {q['agree']}/{q['n']}, kappa {q['kappa']:.6f}; disagreements in test: {report['disagreements_in_test']}")


if __name__ == "__main__":
    main()
