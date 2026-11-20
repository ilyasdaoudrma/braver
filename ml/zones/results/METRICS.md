# Zone classifier — zones-2026-11-20

Held-out test set (`ml/zones/data/splits/test.csv`, sha256 `299ad024d3593586…`), never used for training or for C.
All rows are synthetic (LLM-generated, see DATA_CARD.md); test rows are the groups where three AI judgements agree.

| Set | n | Accuracy | Macro F1 | scenario P / R / F1 | action P / R / F1 | acceptation P / R / F1 |
|---|---|---|---|---|---|---|
| all | 249 | 0.9076 | 0.8774 | 0.9663 / 0.8687 / 0.9149 | 0.9237 / 0.9820 / 0.9520 | 0.7381 / 0.7949 / 0.7654 |
| lang=darija_arab | 83 | 0.9036 | 0.8696 | 0.9667 / 0.8788 / 0.9206 | 0.9231 / 0.9730 / 0.9474 | 0.7143 / 0.7692 / 0.7407 |
| lang=darija_latn | 83 | 0.8554 | 0.8031 | 0.9310 / 0.8182 / 0.8710 | 0.8780 / 0.9730 / 0.9231 | 0.6154 / 0.6154 / 0.6154 |
| lang=fr | 83 | 0.9639 | 0.9559 | 1.0000 / 0.9091 / 0.9524 | 0.9737 / 1.0000 / 0.9867 | 0.8667 / 1.0000 / 0.9286 |

Confusion matrix (all test rows; rows = true, columns = predicted):

| | scenario | action | acceptation |
|---|---|---|---|
| scenario | 86 | 2 | 11 |
| action | 2 | 109 | 0 |
| acceptation | 1 | 7 | 31 |
