"""D2 step 2: blind zone labels by two different LLMs on Groq.

- qwen/qwen3.8-27b              -> `label` (final label)
- openai/gpt-oss-safeguard-20b  -> `label_second` (second opinion; AI-AI agreement + Cohen's kappa, NOT a human check)
Planned: 120b + qwen. gpt-oss-120b hit its 200k tokens/day limit on 20 Nov, so qwen labels and the safeguard model
(its own quota, so the app's gpt-oss-20b budget stays untouched) gives the second opinion.
Both see only the French version of each worry (all three language versions share the label) and the same
zone definitions as the app prompt (lib/server/prompts.ts). Cached on disk -> resumable.

Output: data/interim/labelled.csv (generated.csv + label, label_second) and results/agreement.json
Usage: ml/.venv/Scripts/python -I ml/zones/label.py [label_second]   (the optional column fills one model's cache only)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.groq_client import GroqJSON  # noqa: E402

INTERIM = HERE / "data" / "interim"
RESULTS = HERE / "results"
CACHE = HERE / "data" / "cache" / "label"
MODELS = {"label": "qwen/qwen3.8-27b", "label_second": "openai/gpt-oss-safeguard-20b"}
BATCH = 12  # qwen: 1,000 output tokens/min; safeguard: 2,000 tokens/min in total
ZONES = ["scenario", "action", "acceptation"]

SYSTEM = """Tu classes des inquiétudes d'étudiants marocains dans UNE zone :
- "scenario" : une prédiction ou une interprétation ("je vais rater", "ils vont me juger"). Ça n'a pas encore eu lieu, ou on ne sait pas ce que les autres pensent.
- "action" : un problème réel sur lequel la personne a une prise, même petite (un dossier à envoyer, une conversation à avoir, un travail à commencer).
- "acceptation" : une réalité qui échappe à son contrôle (décision d'autrui, perte, maladie d'un proche, passé, situation familiale ou économique).
Tout repousser, ne pas arriver à commencer un travail -> "action". La perte d'emploi, la maladie ou la décision d'un proche -> "acceptation".
Si une ligne mélange plusieurs zones, choisis celle qui pèse le plus. Réponds pour chaque id."""

ITEM = {
    "type": "object",
    "properties": {"id": {"type": "string"}, "zone": {"type": "string", "enum": ZONES}},
    "required": ["id", "zone"],
    "additionalProperties": False,
}
SCHEMA = {"type": "object", "properties": {"items": {"type": "array", "items": ITEM}}, "required": ["items"], "additionalProperties": False}


def label_all(client: GroqJSON, model: str, items: list[tuple[str, str]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for start in range(0, len(items), BATCH):
        batch = items[start : start + BATCH]
        user = "\n".join(f"{gid}: {text}" for gid, text in batch)
        data = client.ask(model, SYSTEM, user, SCHEMA, "zones", max_tokens=500, temperature=0.0)
        for it in (data or {}).get("items", []):
            if it.get("zone") in ZONES:
                out[it["id"]] = it["zone"]
        print(f"{model} {min(start + BATCH, len(items))}/{len(items)} calls={client.calls} cached={client.cached}", flush=True)
    return out


def main() -> None:
    gen = pd.read_csv(INTERIM / "generated.csv")
    fr = gen[gen["lang"] == "fr"].drop_duplicates("group")
    items = list(zip(fr["group"], fr["text"]))
    client = GroqJSON(CACHE)
    only = sys.argv[1] if len(sys.argv) > 1 else None  # e.g. "label_second": fill that model's cache only (parallel run)
    for col, model in MODELS.items():
        if only and col != only:
            continue
        labels = label_all(client, model, items)
        gen[col] = gen["group"].map(labels)
    if only:
        return
    gen.to_csv(INTERIM / "labelled.csv", index=False, encoding="utf-8", lineterminator="\n")

    groups = gen.drop_duplicates("group").dropna(subset=["label", "label_second"])
    agree = float((groups["label"] == groups["label_second"]).mean())
    kappa = float(cohen_kappa_score(groups["label"], groups["label_second"], labels=ZONES))
    intent_agree = float((groups["label"] == groups["intent"]).mean())
    report = {
        "what": "AI-AI agreement between qwen3.8-27b (final label) and gpt-oss-safeguard-20b on blind zone labels (French text of each worry). Not a human check.",
        "n_groups": int(len(groups)),
        "agreement_qwen_safeguard": agree,
        "cohen_kappa_qwen_safeguard": kappa,
        "agreement_qwen_generation_intent": intent_agree,
        "confusion_qwen_rows_vs_safeguard_cols": pd.crosstab(groups["label"], groups["label_second"]).reindex(index=ZONES, columns=ZONES, fill_value=0).values.tolist(),
        "labels": ZONES,
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "agreement.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
