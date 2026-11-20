"""M2: train the on-device zone classifier (scenario / action / acceptation) and export it for the browser.

Same recipe as M1: TF-IDF char_wb 2-5 n-grams on normalize(text) + multinomial LogisticRegression.
C is picked on VAL (macro-F1). TEST is touched once, at the end, for the report.
Outputs: public/models/zones.json, ml/zones/parity_cases.json, ml/zones/results/{metrics.json, METRICS.md}

Usage: ml/.venv/Scripts/python -I ml/zones/train.py
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
MODEL_OUT = ROOT / "public" / "models" / "zones.json"
PARITY_OUT = HERE / "parity_cases.json"
ZONES = ["scenario", "action", "acceptation"]
MAX_FEATURES = 20000
SEED = 42


def metrics(y: np.ndarray, pred: np.ndarray) -> dict:
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=ZONES, zero_division=0)
    return {
        "n": int(len(y)),
        "accuracy": float((y == pred).mean()) if len(y) else None,
        "per_class": {z: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(s[i])} for i, z in enumerate(ZONES)},
        "macro_f1": float(f.mean()),
        "confusion": {"labels": ZONES, "matrix": confusion_matrix(y, pred, labels=ZONES).tolist()},
    }


def main() -> None:
    train, val, test = (pd.read_csv(SPLITS / f"{n}.csv") for n in ("train", "val", "test"))
    best = None
    for c in (0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0):
        vec = make_vectorizer(MAX_FEATURES)
        clf = LogisticRegression(C=c, max_iter=4000, random_state=SEED).fit(vec.fit_transform(train["text"]), train["label"])
        f1 = f1_score(val["label"], clf.predict(vec.transform(val["text"])), average="macro")
        print(f"C={c}: val macro-F1 = {f1:.4f}")
        if best is None or f1 > best[0]:
            best = (f1, c, vec, clf)
    _, c, vec, clf = best
    classes = [str(x) for x in clf.classes_]
    version = f"zones-{date.today().isoformat()}"
    model = export(vec, clf, classes, {"version": version})
    save_json(model, MODEL_OUT)

    proba = clf.predict_proba(vec.transform(test["text"]))
    test = test.assign(pred=[classes[i] for i in proba.argmax(1)])
    report = {
        "model": version,
        "C": c,
        "train_n": int(len(train)),
        "val_n": int(len(val)),
        "test_sha256": hashlib.sha256((SPLITS / "test.csv").read_bytes()).hexdigest(),
        "val": metrics(val["label"].to_numpy(), clf.predict(vec.transform(val["text"]))),
        "test": metrics(test["label"].to_numpy(), test["pred"].to_numpy()),
        "test_by_lang": {k: metrics(g["label"].to_numpy(), g["pred"].to_numpy()) for k, g in test.groupby("lang")},
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    write_markdown(report)

    sample = test.sample(min(50, len(test)), random_state=SEED)
    cases = []
    for text in sample["text"]:
        p_sk = clf.predict_proba(vec.transform([text]))[0]
        p_ex = predict_from_export(model, text)
        assert max(abs(a - b) for a, b in zip(p_sk, p_ex)) < 1e-9, text
        cases.append({"text": text, "p": [float(x) for x in p_sk]})
    PARITY_OUT.write_text(json.dumps({"classes": classes, "cases": cases}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: report["test"][k] for k in ("n", "accuracy", "macro_f1")}, indent=1))
    print(f"exported {MODEL_OUT.relative_to(ROOT)} ({MODEL_OUT.stat().st_size // 1024} KB)")


def fmt(x: float | None) -> str:
    return "-" if x is None else f"{x:.4f}"


def write_markdown(r: dict) -> None:
    head = "| Set | n | Accuracy | Macro F1 | " + " | ".join(f"{z} P / R / F1" for z in ZONES) + " |"
    lines = [
        f"# Zone classifier — {r['model']}",
        "",
        f"Held-out test set (`ml/zones/data/splits/test.csv`, sha256 `{r['test_sha256'][:16]}…`), never used for training or for C.",
        "All rows are synthetic (LLM-generated, see DATA_CARD.md); test rows are the groups where three AI judgements agree.",
        "",
        head,
        "|" + "---|" * (4 + len(ZONES)),
    ]
    for name, m in [("all", r["test"])] + [(f"lang={k}", v) for k, v in r["test_by_lang"].items()]:
        cells = " | ".join(f"{fmt(m['per_class'][z]['precision'])} / {fmt(m['per_class'][z]['recall'])} / {fmt(m['per_class'][z]['f1'])}" for z in ZONES)
        lines.append(f"| {name} | {m['n']} | {fmt(m['accuracy'])} | {fmt(m['macro_f1'])} | {cells} |")
    cm = r["test"]["confusion"]["matrix"]
    lines += ["", "Confusion matrix (all test rows; rows = true, columns = predicted):", "", "| | " + " | ".join(ZONES) + " |", "|---|---|---|---|"]
    lines += [f"| {z} | " + " | ".join(str(v) for v in cm[i]) + " |" for i, z in enumerate(ZONES)]
    (RESULTS / "METRICS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
