"""M1: train the on-device safety classifier and export it for the browser.

Recipe: TF-IDF char_wb 2-5 n-grams on normalize(text) + LogisticRegression(class_weight="balanced").
C is picked on VAL (best danger F1). Thresholds are tuned on VAL only:
- `threshold`: highest score with val recall(danger) >= 0.95  -> below it the line is "no danger"
- `high`: lowest score with val precision(danger) >= 0.95    -> at or above it the device alerts alone
  Between the two = ambiguous band: the LLM decides, offline -> alert (lib/safety/pipeline.ts).
TEST is touched once, at the end, for the report (results/metrics.json + METRICS.md).

Usage: ml/.venv/Scripts/python -I ml/safety/train.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, f1_score, precision_recall_fscore_support

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT))
from ml.common.charmodel import export, make_vectorizer, predict_from_export, save_json  # noqa: E402

SPLITS = HERE / "data" / "splits"
RESULTS = HERE / "results"
MODEL_OUT = ROOT / "public" / "models" / "safety.json"
PARITY_OUT = HERE / "parity_cases.json"
MAX_FEATURES = 20000
RECALL_TARGET = 0.95
PRECISION_TARGET = 0.95
SEED = 42


def load(name: str) -> pd.DataFrame:
    return pd.read_csv(SPLITS / f"{name}.csv")


def threshold_for_recall(y: np.ndarray, p: np.ndarray, target: float) -> float:
    """Highest threshold t such that recall(p >= t) >= target."""
    pos = np.sort(p[y == 1])[::-1]
    k = int(np.ceil(target * len(pos)))
    return float(pos[k - 1]) if k else 0.5


def threshold_for_precision(y: np.ndarray, p: np.ndarray, target: float, floor: float) -> float:
    """Lowest threshold t >= floor such that precision(p >= t) >= target (1.0 if none)."""
    for t in np.unique(p[p >= floor]):
        pred = p >= t
        if pred.sum() and (y[pred] == 1).mean() >= target:
            return float(t)
    return 1.0


def metrics(y: np.ndarray, pred: np.ndarray) -> dict:
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=[0, 1], zero_division=0)
    cm = confusion_matrix(y, pred, labels=[0, 1])
    return {
        "n": int(len(y)),
        "accuracy": float((y == pred).mean()) if len(y) else None,
        "per_class": {
            name: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(s[i])}
            for i, name in enumerate(["no_danger", "danger"])
        },
        "macro_f1": float(f.mean()),
        "confusion": {"labels": ["no_danger", "danger"], "matrix": cm.tolist()},
    }


def main() -> None:
    train, val, test = load("train"), load("val"), load("test")
    best = None
    for c in (0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0):
        vec = make_vectorizer(MAX_FEATURES)
        x = vec.fit_transform(train["text"])
        clf = LogisticRegression(C=c, class_weight="balanced", max_iter=4000, random_state=SEED).fit(x, train["label"])
        pv = clf.predict_proba(vec.transform(val["text"]))[:, 1]
        f1 = f1_score(val["label"], pv >= 0.5)
        print(f"C={c}: val danger F1 @0.5 = {f1:.4f}")
        if best is None or f1 > best[0]:
            best = (f1, c, vec, clf, pv)
    _, c, vec, clf, pv = best
    yv = val["label"].to_numpy()
    low = threshold_for_recall(yv, pv, RECALL_TARGET)
    high = max(low, threshold_for_precision(yv, pv, PRECISION_TARGET, low))
    print(f"chosen C={c}, threshold={low:.4f}, high={high:.4f}")

    version = f"safety-{date.today().isoformat()}"
    model = export(vec, clf, ["no_danger", "danger"], {"version": version, "threshold": low, "high": high})
    save_json(model, MODEL_OUT)

    # Report on TEST (held out), overall, per language and per source.
    pt = clf.predict_proba(vec.transform(test["text"]))[:, 1]
    test = test.assign(p=pt, pred=(pt >= low).astype(int))
    report = {
        "model": version,
        "C": c,
        "threshold": low,
        "high": high,
        "train_n": int(len(train)),
        "val_n": int(len(val)),
        "test_sha256": hashlib.sha256((SPLITS / "test.csv").read_bytes()).hexdigest(),
        "val_at_threshold": metrics(yv, (pv >= low).astype(int)),
        "test": metrics(test["label"].to_numpy(), test["pred"].to_numpy()),
        "test_at_high": metrics(test["label"].to_numpy(), (test["p"] >= high).astype(int).to_numpy()),
        "test_by_lang": {k: metrics(g["label"].to_numpy(), g["pred"].to_numpy()) for k, g in test.groupby("lang")},
        "test_by_source": {k: metrics(g["label"].to_numpy(), g["pred"].to_numpy()) for k, g in test.groupby("source")},
        "test_band": {
            "alone_alert": int((test["p"] >= high).sum()),
            "ambiguous": int(((test["p"] >= low) & (test["p"] < high)).sum()),
            "no_danger": int((test["p"] < low).sum()),
        },
        "false_negatives": test[(test["label"] == 1) & (test["pred"] == 0)][["id", "lang", "text", "p"]].to_dict("records"),
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    write_markdown(report)

    # Parity cases: 50 test texts, probability from sklearn and from the exported JSON.
    sample = test.sample(50, random_state=SEED)
    cases = []
    for text, p in zip(sample["text"], sample["p"]):
        p_export = predict_from_export(model, text)[1]
        assert abs(p_export - p) < 1e-9, (text, p, p_export)
        cases.append({"text": text, "p": float(p)})
    PARITY_OUT.write_text(json.dumps(cases, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report["test"], indent=1))
    print(f"exported {MODEL_OUT.relative_to(ROOT)} ({MODEL_OUT.stat().st_size // 1024} KB)")


def fmt(x: float | None) -> str:
    return "-" if x is None else f"{x:.4f}"


def write_markdown(r: dict) -> None:
    lines = [
        f"# Safety classifier — {r['model']}",
        "",
        f"Held-out test set (`ml/safety/data/splits/test.csv`, sha256 `{r['test_sha256'][:16]}…`), never used for training or thresholds.",
        f"Thresholds tuned on val: no-danger below **{r['threshold']:.4f}**, device alerts alone from **{r['high']:.4f}**, "
        "ambiguous band in between (LLM decides, offline → alert). Metrics below use the low threshold (alert or ask the LLM).",
        "",
        "| Set | n | Accuracy | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | No-danger F1 | Macro F1 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    rows = [("all", r["test"])] + [(f"lang={k}", v) for k, v in r["test_by_lang"].items()] + [
        (f"source={k}", v) for k, v in r["test_by_source"].items()
    ]
    for name, m in rows:
        d, o = m["per_class"]["danger"], m["per_class"]["no_danger"]
        lines.append(
            f"| {name} | {m['n']} | {fmt(m['accuracy'])} | {fmt(d['precision'])} | {fmt(d['recall'])} | {fmt(d['f1'])} "
            f"| {fmt(o['precision'])} | {fmt(o['recall'])} | {fmt(o['f1'])} | {fmt(m['macro_f1'])} |"
        )
    cm = r["test"]["confusion"]["matrix"]
    lines += [
        "",
        "Confusion matrix (all test rows; rows = true, columns = predicted):",
        "",
        "| | pred no_danger | pred danger |",
        "|---|---|---|",
        f"| true no_danger | {cm[0][0]} | {cm[0][1]} |",
        f"| true danger | {cm[1][0]} | {cm[1][1]} |",
        "",
        f"Bands on test: device alone {r['test_band']['alone_alert']}, ambiguous {r['test_band']['ambiguous']}, "
        f"no danger {r['test_band']['no_danger']}. False negatives listed in `metrics.json`. Offline, every line in the "
        "ambiguous band alerts (no LLM to decide): the test negatives are dataset rows, not real worries typed in Vider, so "
        "the real offline false-alert rate is not measured here (E1 measures the full pipeline).",
        "",
        f"At the high threshold alone (device alerts without the LLM): danger precision "
        f"{fmt(r['test_at_high']['per_class']['danger']['precision'])}, recall {fmt(r['test_at_high']['per_class']['danger']['recall'])} "
        f"(n = {r['test_at_high']['n']}).",
    ]
    (RESULTS / "METRICS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
