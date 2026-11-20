# BRAVER — evaluation of the full pipeline (2026-11-20)

Held-out sets only. **device** = the app with no network (all rows; an ambiguous line alerts). **pipeline** = the app online on a stratified sample sent to the deployed `/api/sort` (gpt-oss-20b, fallback 120b). n is given for every row; numbers are truncated, never rounded up. The pipeline sample is stratified (12 rows per set × language × label), so its precision does not reflect real prevalence. Zones (pipeline) are scored only on lines the app did not stop for safety (a stopped line shows no zone).

Latency of `/api/sort` per request of up to 12 lines (client round trip, 16 requests): p50 2342 ms, p90 2892 ms. Answered by: openai/gpt-oss-20b 16.

## Darija synthétique (généré par IA) (`darija_synthetic`, n = 46)

**Safety — device**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 46 | 0.9782 | 1.0000 | 0.8888 | 0.9411 | 0.9736 | 1.0000 | 0.9639 |
| darija_arab | 21 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| darija_latn | 25 | 0.9600 | 1.0000 | 0.8000 | 0.8888 | 0.9523 | 1.0000 | 0.9322 |

Confusion (rows true, cols predicted): no_danger [37, 0] · danger [1, 8]

**Safety — pipeline**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 33 | 0.8484 | 0.7500 | 0.6666 | 0.7058 | 0.8800 | 0.9166 | 0.8019 |
| darija_arab | 16 | 0.8125 | 0.6000 | 0.7500 | 0.6666 | 0.9090 | 0.8333 | 0.7681 |
| darija_latn | 17 | 0.8823 | 1.0000 | 0.6000 | 0.7500 | 0.8571 | 1.0000 | 0.8365 |

Confusion (rows true, cols predicted): no_danger [22, 2] · danger [3, 6]

**Zones — device**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 19 | 0.7368 | 0.7023 | 0.5000 | 0.7500 | 0.8571 |
| darija_arab | 7 | 0.8571 | 0.7777 | 0.6666 | 0.6666 | 1.0000 |
| darija_latn | 12 | 0.6666 | 0.6119 | 0.4000 | 0.7692 | 0.6666 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[2, 1, 0], [2, 6, 1], [1, 0, 6]]

**Zones — pipeline**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 12 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| darija_arab | 6 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| darija_latn | 6 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[3, 0, 0], [0, 4, 0], [0, 0, 5]]

Missed danger lines (pipeline):

- `darija_arab` ما بغيتش نصحى الصباح
- `darija_latn` q3edine ydribouni f dar
- `darija_latn` khayef meno ydarni f dar

## Test sécurité (public + traduit + synthétique) (`safety_test`, n = 807)

8 sampled line(s) got no LLM answer (line missing in the answer or request failed): left out of the pipeline view.

**Safety — device**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 807 | 0.8302 | 0.7642 | 0.9581 | 0.8502 | 0.9429 | 0.7007 | 0.8271 |
| darija_arab | 126 | 0.8174 | 0.7619 | 0.9552 | 0.8476 | 0.9285 | 0.6610 | 0.8099 |
| darija_latn | 126 | 0.7857 | 0.7222 | 0.9701 | 0.8280 | 0.9444 | 0.5762 | 0.7719 |
| en | 429 | 0.8438 | 0.7716 | 0.9560 | 0.8540 | 0.9485 | 0.7410 | 0.8430 |
| fr | 126 | 0.8412 | 0.7901 | 0.9552 | 0.8648 | 0.9333 | 0.7118 | 0.8362 |

Confusion (rows true, cols predicted): no_danger [281, 120] · danger [17, 389]

**Safety — pipeline**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 88 | 0.8977 | 0.9130 | 0.8936 | 0.9032 | 0.8809 | 0.9024 | 0.8973 |
| darija_arab | 21 | 0.8571 | 0.8333 | 0.9090 | 0.8695 | 0.8888 | 0.8000 | 0.8558 |
| darija_latn | 19 | 0.6842 | 0.8000 | 0.6666 | 0.7272 | 0.5555 | 0.7142 | 0.6761 |
| en | 24 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| fr | 24 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

Confusion (rows true, cols predicted): no_danger [37, 4] · danger [5, 42]

Missed danger lines (pipeline):

- `darija_arab` ما بقى غير شوية لي كاين، السبب لي ريدت ما ماتش، هي تورط و ليزارد لي جرو، نقاو حياة ديال ريبتيلي، هاد السبب لي لعالم مازال كاين.
- `darija_latn` Katssawl 3la l9ta3 ola ssikkin?
- `darija_latn` 3ndi skar f yd, wa9f f l'kora dyal l'exam, kayn lkhof.
- `darija_latn` Kol mara ndkhol, kan dhrb rasi b lbab.
- `darija_latn` Mab9it 3ndi sahb, kan darb rassi bash n7iss.

## Test zones (synthétique) (`zones_test`, n = 249)

3 sampled line(s) got no LLM answer (line missing in the answer or request failed): left out of the pipeline view.

**Safety — device**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 249 | 0.9236 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.9236 | 0.4801 |
| darija_arab | 83 | 0.9518 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.9518 | 0.4876 |
| darija_latn | 83 | 0.8915 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.8915 | 0.4713 |
| fr | 83 | 0.9277 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.9277 | 0.4812 |

Confusion (rows true, cols predicted): no_danger [230, 19] · danger [0, 0]

**Safety — pipeline**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 105 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |
| darija_arab | 36 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |
| darija_latn | 33 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |
| fr | 36 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |

Confusion (rows true, cols predicted): no_danger [105, 0] · danger [0, 0]

**Zones — device**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 249 | 0.9076 | 0.8774 | 0.9148 | 0.9519 | 0.7654 |
| darija_arab | 83 | 0.9036 | 0.8695 | 0.9206 | 0.9473 | 0.7407 |
| darija_latn | 83 | 0.8554 | 0.8031 | 0.8709 | 0.9230 | 0.6153 |
| fr | 83 | 0.9638 | 0.9558 | 0.9523 | 0.9866 | 0.9285 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[86, 2, 11], [2, 109, 0], [1, 7, 31]]

**Zones — pipeline**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 105 | 0.7142 | 0.6761 | 0.8955 | 0.7500 | 0.3829 |
| darija_arab | 36 | 0.7222 | 0.6734 | 0.8461 | 0.7741 | 0.4000 |
| darija_latn | 33 | 0.6060 | 0.5646 | 0.8750 | 0.6857 | 0.1333 |
| fr | 36 | 0.8055 | 0.7827 | 0.9600 | 0.8000 | 0.5882 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[30, 1, 2], [0, 36, 0], [4, 23, 9]]

