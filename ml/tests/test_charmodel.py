"""The plain-Python n-grams and the export-only prediction must match sklearn exactly."""
import numpy as np
from sklearn.linear_model import LogisticRegression

from ml.common.charmodel import char_wb_ngrams, export, make_vectorizer, predict_from_export
from ml.common.text import normalize

TEXTS = [
    "Je veux mourir.", "Ce partiel va me tuer !", "bghit nmout", "ما بقيتش بغيت نعيش", "Mazal ma siftsh dossier",
    "Bba khrjouh mn lkhedma.", "j'ai peur de rater", "kolchi ghadi yd7ek 3liya", "a", "خاصني نسلم الرابور",
]
LABELS = [1, 0, 1, 1, 0, 0, 0, 0, 0, 0]


def test_ngrams_match_sklearn_analyzer():
    vec = make_vectorizer(5000)
    analyzer = vec.build_analyzer()
    for t in TEXTS:
        assert char_wb_ngrams(normalize(t)) == analyzer(t)


def test_export_prediction_matches_sklearn():
    vec = make_vectorizer(5000)
    x = vec.fit_transform(TEXTS)
    clf = LogisticRegression(class_weight="balanced", max_iter=1000).fit(x, LABELS)
    model = export(vec, clf, ["no_danger", "danger"], {"version": "test"})
    want = clf.predict_proba(vec.transform(TEXTS + ["texte jamais vu"]))[:, 1]
    got = np.array([predict_from_export(model, t)[1] for t in TEXTS + ["texte jamais vu"]])
    assert np.max(np.abs(want - got)) < 1e-9


def test_multiclass_export_matches_sklearn():
    vec = make_vectorizer(5000)
    y = ["scenario", "action", "scenario", "acceptation", "action", "acceptation", "scenario", "scenario", "action", "action"]
    x = vec.fit_transform(TEXTS)
    clf = LogisticRegression(max_iter=1000).fit(x, y)
    model = export(vec, clf, list(clf.classes_), {"version": "test"})
    want = clf.predict_proba(vec.transform(TEXTS))
    got = np.array([predict_from_export(model, t) for t in TEXTS])
    assert np.max(np.abs(want - got)) < 1e-9
