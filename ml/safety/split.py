"""D1 step 5: merge english + translated + synthetic, split 70/15/15 by GROUP (stratified by label x source), seed 42.

A group = one source sentence and all its translations, so no sentence leaks from train into test in another language.
Writes data/processed/all.csv and data/splits/{train,val,test}.csv, prints counts + the SHA-256 of test.csv.

Usage: ml/.venv/Scripts/python -I ml/safety/split.py
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from ml.common.text import normalize  # noqa: E402

INTERIM = HERE / "data" / "interim"
PROCESSED = HERE / "data" / "processed"
SPLITS = HERE / "data" / "splits"
SEED = 42
FRACTIONS = {"train": 0.70, "val": 0.15, "test": 0.15}
COLUMNS = ["id", "group", "text", "label", "lang", "source", "origin"]


def load() -> pd.DataFrame:
    english = pd.read_csv(INTERIM / "english.csv").assign(group=lambda d: d["id"])
    parts = [english]
    for name in ("translated.csv", "synthetic.csv"):
        path = INTERIM / name
        if path.exists():
            parts.append(pd.read_csv(path))
    df = pd.concat(parts, ignore_index=True)
    # Drop normalised duplicates across sources (keep the first, i.e. the original English).
    df = df.assign(norm=df["text"].map(normalize)).drop_duplicates("norm").drop(columns="norm")
    return df[COLUMNS]


def assign_splits(df: pd.DataFrame) -> pd.Series:
    groups = df.groupby("group").agg(label=("label", "first"), source=("source", "first")).reset_index()
    rng = np.random.default_rng(SEED)
    split_of: dict[str, str] = {}
    for _, stratum in groups.groupby(["label", "source"]):
        ids = stratum["group"].to_numpy()
        rng.shuffle(ids)
        n_train = round(len(ids) * FRACTIONS["train"])
        n_val = round(len(ids) * FRACTIONS["val"])
        for i, gid in enumerate(ids):
            split_of[gid] = "train" if i < n_train else "val" if i < n_train + n_val else "test"
    return df["group"].map(split_of)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    df = load()
    df = df.assign(split=assign_splits(df))
    PROCESSED.mkdir(parents=True, exist_ok=True)
    SPLITS.mkdir(parents=True, exist_ok=True)
    df.to_csv(PROCESSED / "all.csv", index=False, encoding="utf-8", lineterminator="\n")
    for name in FRACTIONS:
        part = df[df["split"] == name].drop(columns="split").sort_values("id")
        part.to_csv(SPLITS / f"{name}.csv", index=False, encoding="utf-8", lineterminator="\n")
    table = df.pivot_table(index=["split", "lang"], columns="label", values="id", aggfunc="count", fill_value=0)
    print(table.to_string())
    print(df.pivot_table(index="source", columns="label", values="id", aggfunc="count", fill_value=0).to_string())
    print(f"test.csv sha256 {sha256(SPLITS / 'test.csv')}")


if __name__ == "__main__":
    main()
