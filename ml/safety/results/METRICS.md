# Safety classifier — safety-2026-11-20

Held-out test set (`ml/safety/data/splits/test.csv`, sha256 `f262e5c7dcbcf001…`), never used for training or thresholds.
Thresholds tuned on val: no-danger below **0.2341**, device alerts alone from **0.7502**, ambiguous band in between (LLM decides, offline → alert). Metrics below use the low threshold (alert or ask the LLM).

| Set | n | Accuracy | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | No-danger F1 | Macro F1 |
|---|---|---|---|---|---|---|---|---|---|
| all | 807 | 0.8302 | 0.7642 | 0.9581 | 0.8502 | 0.9429 | 0.7007 | 0.8040 | 0.8271 |
| lang=darija_arab | 126 | 0.8174 | 0.7619 | 0.9552 | 0.8476 | 0.9285 | 0.6610 | 0.7722 | 0.8099 |
| lang=darija_latn | 126 | 0.7857 | 0.7222 | 0.9701 | 0.8280 | 0.9444 | 0.5762 | 0.7157 | 0.7719 |
| lang=en | 429 | 0.8438 | 0.7716 | 0.9560 | 0.8540 | 0.9485 | 0.7410 | 0.8320 | 0.8430 |
| lang=fr | 126 | 0.8412 | 0.7901 | 0.9552 | 0.8648 | 0.9333 | 0.7118 | 0.8076 | 0.8362 |
| source=original | 429 | 0.8438 | 0.7716 | 0.9560 | 0.8540 | 0.9485 | 0.7410 | 0.8320 | 0.8430 |
| source=synthetic | 159 | 0.8930 | 0.8596 | 0.9898 | 0.9201 | 0.9777 | 0.7333 | 0.8380 | 0.8791 |
| source=translated | 219 | 0.7579 | 0.6737 | 0.9313 | 0.7818 | 0.9102 | 0.6068 | 0.7282 | 0.7550 |

Confusion matrix (all test rows; rows = true, columns = predicted):

| | pred no_danger | pred danger |
|---|---|---|
| true no_danger | 281 | 120 |
| true danger | 17 | 389 |

Bands on test: device alone 315, ambiguous 194, no danger 298. False negatives listed in `metrics.json`. Offline, every line in the ambiguous band alerts (no LLM to decide): the test negatives are dataset rows, not real worries typed in Vider, so the real offline false-alert rate is not measured here (E1 measures the full pipeline).

At the high threshold alone (device alerts without the LLM): danger precision 0.9333, recall 0.7241 (n = 807).
