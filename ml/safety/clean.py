"""D1 step 2: clean the English sources into one balanced pool, data/interim/english.csv.

Columns: id, text, label (1 = danger, 0 = no danger), lang (en), source, origin
Cleaning: strip URLs / @usernames / r/subreddits / 'fillerfiller' padding, collapse spaces, keep 5-400 chars, drop exact and
normalised duplicates, drop Aegis rows whose prompt is redacted. Balanced sample, seed 42.

Usage: ml/.venv/Scripts/python -I ml/safety/clean.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.text import normalize  # noqa: E402

RAW = HERE / "data" / "raw"
OUT = HERE / "data" / "interim" / "english.csv"
SEED = 42
PER_CLASS_REDDIT = 1200
AEGIS_SAFE = 300

URL_RE = re.compile(r"https?://\S+|www\.\S+")
USER_RE = re.compile(r"(?<!\w)(@\w+|/?u/\w+|/?r/\w+)")
FILLER_RE = re.compile(r"(?:filler){2,}|(?:\bfiller\b\s*){2,}")


def clean_text(text: str) -> str:
    text = URL_RE.sub(" ", str(text))
    text = USER_RE.sub(" ", text)
    text = FILLER_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def keep(df: pd.DataFrame) -> pd.DataFrame:
    df = df.assign(text=df["text"].map(clean_text))
    df = df[df["text"].str.len().between(5, 400)]
    df = df.assign(norm=df["text"].map(normalize))
    return df.drop_duplicates("text").drop_duplicates("norm").drop(columns="norm")


def reddit() -> pd.DataFrame:
    folder = RAW / "suicide_prediction_dataset_phr"
    df = pd.concat([pd.read_parquet(p) for p in sorted(folder.glob("*.parquet"))], ignore_index=True)
    df = keep(df.assign(label=(df["label"] == "suicide").astype(int)))
    parts = [g.sample(PER_CLASS_REDDIT, random_state=SEED) for _, g in df.groupby("label")]
    out = pd.concat(parts)
    return out.assign(source="original", origin="vibhorag101/suicide_prediction_dataset_phr")


def aegis() -> pd.DataFrame:
    folder = RAW / "Aegis-AI-Content-Safety-Dataset-2.0"
    df = pd.concat([pd.read_json(folder / f"{s}.json") for s in ("train", "validation", "test")], ignore_index=True)
    df = df[df["reconstruction_id_if_redacted"].isna() & ~df["prompt"].astype(str).str.upper().eq("REDACTED")]
    cats = df["violated_categories"].fillna("")
    danger = df[(df["prompt_label"] == "unsafe") & cats.str.contains("Suicide and Self Harm")]
    safe = df[(df["prompt_label"] == "safe") & (cats == "")]
    danger = keep(danger.rename(columns={"prompt": "text"})[["text"]]).assign(label=1)
    safe = keep(safe.rename(columns={"prompt": "text"})[["text"]]).assign(label=0)
    safe = safe.sample(min(AEGIS_SAFE, len(safe)), random_state=SEED)
    return pd.concat([danger, safe]).assign(source="original", origin="nvidia/Aegis-AI-Content-Safety-Dataset-2.0")


def main() -> None:
    df = pd.concat([reddit(), aegis()], ignore_index=True)
    df = df.assign(norm=df["text"].map(normalize)).drop_duplicates("norm").drop(columns="norm")
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)
    df.insert(0, "id", [f"en{i:05d}" for i in range(len(df))])
    df["lang"] = "en"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df[["id", "text", "label", "lang", "source", "origin"]].to_csv(OUT, index=False, encoding="utf-8")
    print(df.groupby(["origin", "label"]).size().to_string())
    print(f"saved {OUT.relative_to(HERE.parents[1])}: {len(df)} rows")


if __name__ == "__main__":
    main()
