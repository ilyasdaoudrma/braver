# Safety classifier — safety-2026-11-20

Held-out test set (`ml/safety/data/splits/test.csv`, sha256 `f262e5c7dcbcf001…`), never used for training or thresholds.
Thresholds tuned on val: no-danger below **0.2341**, device alerts alone from **0.7502**, ambiguous band in between (LLM decides, offline → alert). Metrics below use the low threshold (alert or ask the LLM).

| Set | n | Accuracy | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | No-danger F1 | Macro F1 |
|---|---|---|---|---|---|---|---|---|---|
| all | 807 | 0.8302 | 0.7642 | 0.9581 | 0.8503 | 0.9430 | 0.7007 | 0.8040 | 0.8271 |
| lang=darija_arab | 126 | 0.8175 | 0.7619 | 0.9552 | 0.8477 | 0.9286 | 0.6610 | 0.7723 | 0.8100 |
| lang=darija_latn | 126 | 0.7857 | 0.7222 | 0.9701 | 0.8280 | 0.9444 | 0.5763 | 0.7158 | 0.7719 |
| lang=en | 429 | 0.8438 | 0.7717 | 0.9561 | 0.8540 | 0.9486 | 0.7411 | 0.8321 | 0.8431 |
| lang=fr | 126 | 0.8413 | 0.7901 | 0.9552 | 0.8649 | 0.9333 | 0.7119 | 0.8077 | 0.8363 |
| source=original | 429 | 0.8438 | 0.7717 | 0.9561 | 0.8540 | 0.9486 | 0.7411 | 0.8321 | 0.8431 |
| source=synthetic | 159 | 0.8931 | 0.8596 | 0.9899 | 0.9202 | 0.9778 | 0.7333 | 0.8381 | 0.8791 |
| source=translated | 219 | 0.7580 | 0.6738 | 0.9314 | 0.7819 | 0.9103 | 0.6068 | 0.7282 | 0.7550 |

Confusion matrix (all test rows; rows = true, columns = predicted):

| | pred no_danger | pred danger |
|---|---|---|
| true no_danger | 281 | 120 |
| true danger | 17 | 389 |

Bands on test: device alone 315, ambiguous 194, no danger 298. False negatives listed in `metrics.json`. Offline, every line in the ambiguous band alerts (no LLM to decide): the test negatives are dataset rows, not real worries typed in Vider, so the real offline false-alert rate is not measured here (E1 measures the full pipeline).

At the high threshold alone (device alerts without the LLM): danger precision 0.9333, recall 0.7241 (n = 807).
