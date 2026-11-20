# Zone classifier — zones-2026-11-20

Held-out test set (`ml/zones/data/splits/test.csv`, sha256 `299ad024d3593586…`), never used for training or for C.
All rows are synthetic (LLM-generated, see DATA_CARD.md); test rows are the groups where three AI judgements agree.

| Set | n | Accuracy | Macro F1 | scenario P / R / F1 | action P / R / F1 | acceptation P / R / F1 |
|---|---|---|---|---|---|---|
| all | 249 | 0.9076 | 0.8774 | 0.9662 / 0.8686 / 0.9148 | 0.9237 / 0.9819 / 0.9519 | 0.7380 / 0.7948 / 0.7654 |
| lang=darija_arab | 83 | 0.9036 | 0.8695 | 0.9666 / 0.8787 / 0.9206 | 0.9230 / 0.9729 / 0.9473 | 0.7142 / 0.7692 / 0.7407 |
| lang=darija_latn | 83 | 0.8554 | 0.8031 | 0.9310 / 0.8181 / 0.8709 | 0.8780 / 0.9729 / 0.9230 | 0.6153 / 0.6153 / 0.6153 |
| lang=fr | 83 | 0.9638 | 0.9558 | 1.0000 / 0.9090 / 0.9523 | 0.9736 / 1.0000 / 0.9866 | 0.8666 / 1.0000 / 0.9285 |

Confusion matrix (all test rows; rows = true, columns = predicted):

| | scenario | action | acceptation |
|---|---|---|---|
| scenario | 86 | 2 | 11 |
| action | 2 | 109 | 0 |
| acceptation | 1 | 7 | 31 |
