# Safety classifier — safety-2026-11-20

Held-out test set (`ml/safety/data/splits/test.csv`, sha256 `f262e5c7dcbcf001…`), never used for training or thresholds.
Thresholds tuned on val: no-danger below **0.2896**, device alerts alone from **0.7575**, ambiguous band in between (LLM decides, offline → alert). Metrics below use the low threshold (alert or ask the LLM).

| Set | n | Accuracy | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | No-danger F1 | Macro F1 |
|---|---|---|---|---|---|---|---|---|---|
| all | 807 | 0.8278 | 0.7686 | 0.9409 | 0.8461 | 0.9226 | 0.7132 | 0.8045 | 0.8253 |
| lang=darija_arab | 126 | 0.8016 | 0.7442 | 0.9552 | 0.8366 | 0.9250 | 0.6271 | 0.7475 | 0.7920 |
| lang=darija_latn | 126 | 0.7619 | 0.6947 | 0.9851 | 0.8148 | 0.9677 | 0.5085 | 0.6667 | 0.7407 |
| lang=en | 429 | 0.8671 | 0.8246 | 0.9171 | 0.8684 | 0.9154 | 0.8214 | 0.8659 | 0.8671 |
| lang=fr | 126 | 0.7857 | 0.7273 | 0.9552 | 0.8258 | 0.9211 | 0.5932 | 0.7216 | 0.7737 |
| source=original | 429 | 0.8671 | 0.8246 | 0.9171 | 0.8684 | 0.9154 | 0.8214 | 0.8659 | 0.8671 |
| source=synthetic | 159 | 0.8428 | 0.7984 | 1.0000 | 0.8879 | 1.0000 | 0.5833 | 0.7368 | 0.8124 |
| source=translated | 219 | 0.7397 | 0.6552 | 0.9314 | 0.7692 | 0.9054 | 0.5726 | 0.7016 | 0.7354 |

Confusion matrix (all test rows; rows = true, columns = predicted):

| | pred no_danger | pred danger |
|---|---|---|
| true no_danger | 286 | 115 |
| true danger | 24 | 382 |

Bands on test: device alone 304, ambiguous 193, no danger 310. False negatives listed in `metrics.json`. Offline, every line in the ambiguous band alerts (no LLM to decide): the test negatives are dataset rows, not real worries typed in Vider, so the real offline false-alert rate is not measured here (E1 measures the full pipeline).

At the high threshold alone (device alerts without the LLM): danger precision 0.9408, recall 0.7044 (n = 807).
