"""D1 step 3: translate a stratified sample of the English pool into French, Darija (Latin letters) and
Darija (Arabic letters) with openai/gpt-oss-120b on Groq. Cached on disk -> resumable.

Output: data/interim/translated.csv  (id, group, text, label, lang, source=translated, origin, translator)
`group` = id of the English row, so every version of one sentence lands in the same split (no leakage).

Usage: ml/.venv/Scripts/python -I ml/safety/translate.py [--n 500]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.groq_client import GroqJSON  # noqa: E402

INTERIM = HERE / "data" / "interim"
CACHE = HERE / "data" / "cache" / "translate"
MODEL = "openai/gpt-oss-120b"
SEED = 42
BATCH = 10
LANGS = ("fr", "darija_latn", "darija_arab")

SYSTEM = """You translate short messages for a research dataset that trains a suicide-prevention safety filter for young people in Morocco.
For each input message, write it as a short natural message that a Moroccan student (18-25) could type, in three versions:
- fr: French, first person, informal
- darija_latn: Moroccan Darija in Latin letters, the way people text (use 3, 7, 9, 2 for Arabic sounds, e.g. "bghit", "ma b9itch", "3ndi")
- darija_arab: Moroccan Darija in Arabic letters (not Modern Standard Arabic)
Rules:
- Keep EXACTLY the same meaning and the same level of danger: if the message talks about suicide, self-harm or wanting to die, keep it explicit; if it does not, never add it.
- Some inputs have their small words removed ("need end suffering want die"); rebuild a natural sentence without adding new facts.
- Keep it short (at most 2 sentences, under 220 characters). No hashtags, no emoji, no names of real people.
- Return one item per input, same id."""

ITEM = {
    "type": "object",
    "properties": {"id": {"type": "string"}, **{lang: {"type": "string"} for lang in LANGS}},
    "required": ["id", *LANGS],
    "additionalProperties": False,
}
SCHEMA = {
    "type": "object",
    "properties": {"items": {"type": "array", "items": ITEM}},
    "required": ["items"],
    "additionalProperties": False,
}


# Reddit "suicide" labels come from the subreddit, so some positives say nothing about danger
# ("prison would be a vacation"). For the translated sample only, a Reddit positive must contain one of
# these explicit terms. Documented as a selection bias in DATA_CARD.md.
EXPLICIT = r"\b(die|dying|dead|death|suicid\w*|kill (my ?self|me)|end (it|my life)|cut(ting)? (my ?self)?|self ?harm|hurt my ?self|overdose|pills|not (want|wanna) (to )?live|want to live|no reason to live|life)\b"


def sample(english: pd.DataFrame, n: int) -> pd.DataFrame:
    short = english[english["text"].str.len() <= 220]
    reddit_pos = (short["label"] == 1) & short["origin"].str.startswith("vibhorag101")
    short = short[~reddit_pos | short["text"].str.contains(EXPLICIT, case=False, regex=True)]
    parts = []
    for label, group in short.groupby("label"):
        k = n // 2
        weights = group["origin"].map(group["origin"].value_counts(normalize=True))
        parts.append(group.sample(min(k, len(group)), random_state=SEED, weights=1 / weights))
    return pd.concat(parts).sample(frac=1, random_state=SEED)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=500)
    args = parser.parse_args()
    english = pd.read_csv(INTERIM / "english.csv")
    picked = sample(english, args.n)
    client = GroqJSON(CACHE)
    rows, missing = [], 0
    records = picked.to_dict("records")
    for start in range(0, len(records), BATCH):
        batch = records[start : start + BATCH]
        user = "\n".join(f'{r["id"]}: {r["text"]}' for r in batch)
        data = client.ask(MODEL, SYSTEM, user, SCHEMA, "translations", max_tokens=2600, temperature=0.3)
        got = {item["id"]: item for item in (data or {}).get("items", [])}
        for r in batch:
            item = got.get(r["id"])
            if not item:
                missing += 1
                continue
            for lang in LANGS:
                text = " ".join(str(item[lang]).split())
                if 5 <= len(text) <= 400:
                    rows.append(
                        {"id": f'{r["id"]}-{lang}', "group": r["id"], "text": text, "label": r["label"],
                         "lang": lang, "source": "translated", "origin": r["origin"], "translator": MODEL}
                    )
        print(f"{min(start + BATCH, len(records))}/{len(records)}  calls={client.calls} cached={client.cached}", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(INTERIM / "translated.csv", index=False, encoding="utf-8")
    print(out.groupby(["lang", "label"]).size().to_string())
    print(f"saved {len(out)} rows, {missing} sentences without a translation")


if __name__ == "__main__":
    main()
