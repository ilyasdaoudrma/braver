"""Shared recipe for the on-device text models (M1 safety, M2 zones).

Features = sklearn TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5)) on ml.common.text.normalize(text),
l2-normalised. lib/charmodel.ts reproduces exactly the same features and the same probabilities from the
exported JSON (parity tests: |delta| < 1e-6).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from ml.common.text import normalize

NGRAMS = (2, 5)


def make_vectorizer(max_features: int) -> TfidfVectorizer:
    return TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=NGRAMS,
        max_features=max_features,
        lowercase=False,
        preprocessor=normalize,
        sublinear_tf=True,
        dtype=np.float64,
    )


def char_wb_ngrams(text: str) -> list[str]:
    """Plain-Python copy of sklearn's _char_wb_ngrams on an already normalised text (used by tests)."""
    out: list[str] = []
    for w in text.split():
        w = f" {w} "
        for n in range(NGRAMS[0], NGRAMS[1] + 1):
            offset = 0
            out.append(w[offset : offset + n])
            while offset + n < len(w):
                offset += 1
                out.append(w[offset : offset + n])
            if offset == 0:
                break
    return out


def export(vec: TfidfVectorizer, clf: LogisticRegression, classes: list[str], extra: dict[str, Any]) -> dict[str, Any]:
    vocab = vec.vocabulary_
    terms = [""] * len(vocab)
    for term, idx in vocab.items():
        terms[idx] = term
    coef = clf.coef_  # (1, F) for binary, (K, F) for multinomial
    return {
        "kind": "char_wb_tfidf_logreg",
        "ngram": list(NGRAMS),
        "sublinear_tf": True,
        "classes": classes,
        "terms": terms,
        "idf": [float(x) for x in vec.idf_],
        "coef": [[float(x) for x in row] for row in coef],
        "intercept": [float(x) for x in clf.intercept_],
        **extra,
    }


def predict_from_export(model: dict[str, Any], text: str) -> list[float]:
    """Probabilities computed from the exported JSON only (what the browser does)."""
    index = {t: i for i, t in enumerate(model["terms"])}
    counts: dict[int, int] = {}
    for g in char_wb_ngrams(normalize(text)):
        i = index.get(g)
        if i is not None:
            counts[i] = counts.get(i, 0) + 1
    weights = {i: (1 + math.log(c)) * model["idf"][i] for i, c in counts.items()}
    norm = math.sqrt(sum(v * v for v in weights.values())) or 1.0
    scores = [b + sum(row[i] * v / norm for i, v in weights.items()) for row, b in zip(model["coef"], model["intercept"])]
    if len(scores) == 1:
        p = 1 / (1 + math.exp(-scores[0]))
        return [1 - p, p]
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def save_json(obj: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
