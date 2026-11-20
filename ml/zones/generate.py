"""D2 step 1: generate zone candidates (synthetic, openai/gpt-oss-120b), in fr + darija_latn + darija_arab.

No public dataset has BRAVER's zone labels. danthareja/cognitive-distortion has no licence on its card, so it is
not used. Every row here is source=synthetic. The generation intent (`intent`) is NOT the final label:
label.py asks gpt-oss-120b to label each worry blind (final label) and qwen/qwen3.8-27b to label it again
(AI-AI agreement, Cohen's kappa). Only rows where intent, 120b and qwen agree may enter the test split.

Output: data/interim/generated.csv (group, lang, text, intent, theme, generator)
Usage: ml/.venv/Scripts/python -I ml/zones/generate.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.groq_client import GroqJSON  # noqa: E402
from ml.common.text import normalize  # noqa: E402

INTERIM = HERE / "data" / "interim"
CACHE = HERE / "data" / "cache" / "generate"
MODEL = "openai/gpt-oss-120b"
# gpt-oss-120b hit its 200k tokens/day limit on 20 Nov: batches not already cached are written by qwen.
FALLBACK = "qwen/qwen3.8-27b"
FALLBACK_PER_CALL = 5
LANGS = ("fr", "darija_latn", "darija_arab")
PER_CALL = 15

ZONES = {
    "scenario": "a PREDICTION or an INTERPRETATION that has not been checked: something bad that might happen "
    "('I am going to fail', 'everyone will laugh at me'), or a guess about what others think ('my teacher hates me', "
    "'she must be angry at me').",
    "action": "a REAL problem the writer can act on today with a small step: something not done yet, postponed, to "
    "send, to prepare, to ask, to fix ('I still have not sent my internship file', 'I must talk to my roommate').",
    "acceptation": "something REAL that already happened or that the writer CANNOT control: a death, an illness, a "
    "refusal already decided, parents divorcing, a parent losing their job, the past ('my grandmother died', "
    "'I was not accepted', 'I should have studied more last year').",
}
THEMES = [
    "university, exams and grades",
    "family and home",
    "money, scholarship and transport",
    "friends, roommates and love",
    "internship, job search and the future",
]

SYSTEM = """You write short realistic worries for a dataset that trains a worry-sorting app for Moroccan students (18-25).
Each worry is one sentence in the first person, as typed on a phone (informal, sometimes without accents), under 140 characters.
No danger, no suicide, no self-harm, no violence. No real names, no emoji. Each worry has three versions with the same
meaning: fr (French), darija_latn (Moroccan Darija in Latin letters with 3, 7, 9, 2), darija_arab (Moroccan Darija in
Arabic letters, not Modern Standard Arabic). All worries in a batch must be different."""

ITEM = {"type": "object", "properties": {k: {"type": "string"} for k in LANGS}, "required": list(LANGS), "additionalProperties": False}
SCHEMA = {"type": "object", "properties": {"items": {"type": "array", "items": ITEM}}, "required": ["items"], "additionalProperties": False}


def main() -> None:
    client = GroqJSON(CACHE)
    rows, seen = [], set()
    for zone, definition in ZONES.items():
        for t, theme in enumerate(THEMES):
            for k in range(3):
                user = f"Write {PER_CALL} worries of this type: {definition}\nTheme of this batch: {theme}. Variation #{k + 1}."
                data = client.from_cache(MODEL, SYSTEM, user, SCHEMA, "worries", max_tokens=2600, temperature=0.9)
                generator = MODEL
                if data is None:
                    # qwen allows only 1,000 OUTPUT tokens per minute: ask for 5 worries per call instead of 15.
                    small = user.replace(f"Write {PER_CALL} worries", f"Write {FALLBACK_PER_CALL} worries")
                    data = client.ask(FALLBACK, SYSTEM, small, SCHEMA, "worries", max_tokens=950, temperature=0.9)
                    generator = FALLBACK
                for i, item in enumerate((data or {}).get("items", [])):
                    key = normalize(item["fr"])
                    if key in seen:
                        continue
                    seen.add(key)
                    group = f"z-{zone[:3]}-{t}{k}-{i:02d}"
                    for lang in LANGS:
                        text = " ".join(str(item[lang]).split())
                        if 5 <= len(text) <= 300:
                            rows.append({"group": group, "lang": lang, "text": text, "intent": zone, "theme": theme, "generator": generator})
                print(f"{zone} {theme} {k + 1}/3 calls={client.calls} cached={client.cached}", flush=True)
    out = pd.DataFrame(rows)
    INTERIM.mkdir(parents=True, exist_ok=True)
    out.to_csv(INTERIM / "generated.csv", index=False, encoding="utf-8", lineterminator="\n")
    print(out.groupby(["intent", "lang"]).size().unstack().to_string())


if __name__ == "__main__":
    main()
