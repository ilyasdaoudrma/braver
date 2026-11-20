"""D2 step 3: split labelled worries 70/15/15 by group (seed 42) and prepare the morning hand-check file.

- Final label = qwen blind label (label.py). Groups without a label are dropped.
- TEST groups are drawn only from groups where generation intent, qwen and the second labeller all agree (cleanest labels),
  stratified by label, 15 % of all groups. The rest is split 70/15 into train/val (stratified by label).
- to_check_100.csv: 100 random groups (seed 42) for Ilyas to verify by hand (column `human_label` left empty).

Usage: ml/.venv/Scripts/python -I ml/zones/split.py
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

HERE = Path(__file__).resolve().parent
INTERIM = HERE / "data" / "interim"
SPLITS = HERE / "data" / "splits"
SEED = 42
COLUMNS = ["id", "group", "text", "label", "lang", "source", "origin"]
NEAR_DUP = 0.7  # char n-gram cosine of the French texts; a test group this close to a train/val group goes to train


def main() -> None:
    df = pd.read_csv(INTERIM / "labelled.csv").dropna(subset=["label"])
    df = df.assign(id=df["group"] + "-" + df["lang"], source="synthetic", origin=df["theme"])
    groups = df.drop_duplicates("group")[["group", "label", "label_second", "intent"]].reset_index(drop=True)
    groups["clean"] = (groups["label"] == groups["label_second"]) & (groups["label"] == groups["intent"])
    rng = np.random.default_rng(SEED)
    n_test = round(len(groups) * 0.15)
    split: dict[str, str] = {}
    clean = groups[groups["clean"]]
    shares = clean["label"].value_counts(normalize=True)
    for label, part in clean.groupby("label"):
        ids = part["group"].to_numpy()
        rng.shuffle(ids)
        for gid in ids[: round(n_test * shares[label])]:
            split[gid] = "test"
    rest = groups[~groups["group"].isin(split)]
    for _, part in rest.groupby("label"):
        ids = part["group"].to_numpy()
        rng.shuffle(ids)
        n_val = round(len(ids) * 15 / 85)
        for i, gid in enumerate(ids):
            split[gid] = "val" if i < n_val else "train"
    # Review of #33: near-duplicate worries (same sentence, one word changed) must not sit on both sides.
    fr = df[df["lang"] == "fr"].drop_duplicates("group").set_index("group")["text"]
    test_ids = [g for g, s in split.items() if s == "test"]
    other_ids = [g for g, s in split.items() if s != "test"]
    vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5)).fit(fr)
    sim = cosine_similarity(vec.transform(fr[test_ids]), vec.transform(fr[other_ids]))
    moved = [g for g, row in zip(test_ids, sim) if row.max() > NEAR_DUP]
    for gid in moved:
        split[gid] = "train"
    print(f"moved {len(moved)} near-duplicate groups from test to train")
    df = df.assign(split=df["group"].map(split))
    SPLITS.mkdir(parents=True, exist_ok=True)
    for name in ("train", "val", "test"):
        part = df[df["split"] == name][COLUMNS].sort_values("id")
        part.to_csv(SPLITS / f"{name}.csv", index=False, encoding="utf-8", lineterminator="\n")
    print(df.pivot_table(index=["split", "lang"], columns="label", values="id", aggfunc="count", fill_value=0).to_string())
    print(f"clean groups {int(groups['clean'].sum())}/{len(groups)}")
    print(f"test.csv sha256 {hashlib.sha256((SPLITS / 'test.csv').read_bytes()).hexdigest()}")

    pick = groups.sample(100, random_state=SEED)["group"]
    wide = df[df["group"].isin(pick)].pivot_table(index="group", columns="lang", values="text", aggfunc="first")
    check = groups.set_index("group").loc[pick, ["label", "label_second", "intent"]].join(wide)
    check = check.rename(columns={"label": "label_qwen", "label_second": "label_safeguard"}).assign(human_label="")
    check.reset_index().to_csv(HERE / "data" / "to_check_100.csv", index=False, encoding="utf-8", lineterminator="\n")
    print("wrote data/to_check_100.csv")


if __name__ == "__main__":
    main()
