# BRAVER — evaluation of the full pipeline (2026-11-20)

Held-out sets only. **device** = the app with no network (all rows; an ambiguous line alerts). **pipeline** = the app online on a stratified sample sent to the deployed `/api/sort` (gpt-oss-20b, fallback 120b). n is given for every row; numbers are truncated, never rounded up. The pipeline sample is stratified (12 rows per set × language × label), so its precision does not reflect real prevalence. Zones (pipeline) are scored only on lines the app did not stop for safety (a stopped line shows no zone).

Latency of `/api/sort` per request of up to 12 lines (client round trip, 20 requests): p50 2456 ms, p90 2943 ms. Answered by: openai/gpt-oss-20b 20.

## Darija écrit par Claude (IA, sans autre modèle) (`darija_claude`, n = 56)

2 sampled line(s) got no LLM answer (line missing in the answer or request failed): scored as the app does (ambiguous line → alert, otherwise the on-device card).

**Safety — device**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 56 | 0.8928 | 0.7777 | 0.8750 | 0.8235 | 0.9473 | 0.9000 | 0.8733 |
| darija_arab | 26 | 0.8846 | 0.7500 | 0.8571 | 0.8000 | 0.9444 | 0.8947 | 0.8594 |
| darija_latn | 30 | 0.9000 | 0.8000 | 0.8888 | 0.8421 | 0.9500 | 0.9047 | 0.8844 |

Confusion (rows true, cols predicted): no_danger [36, 4] · danger [2, 14]

**Safety — pipeline**

| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |
|---|---|---|---|---|---|---|---|---|
| all | 56 | 0.9107 | 0.8666 | 0.8125 | 0.8387 | 0.9268 | 0.9500 | 0.8884 |
| darija_arab | 26 | 0.9615 | 1.0000 | 0.8571 | 0.9230 | 0.9500 | 1.0000 | 0.9487 |
| darija_latn | 30 | 0.8666 | 0.7777 | 0.7777 | 0.7777 | 0.9047 | 0.9047 | 0.8412 |

Confusion (rows true, cols predicted): no_danger [38, 2] · danger [3, 13]

**Zones — device**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 31 | 0.7419 | 0.7424 | 0.7500 | 0.7500 | 0.7272 |
| darija_arab | 15 | 0.8000 | 0.8027 | 0.7500 | 0.8888 | 0.7692 |
| darija_latn | 16 | 0.6875 | 0.6944 | 0.7500 | 0.6666 | 0.6666 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[6, 2, 2], [0, 9, 2], [0, 2, 8]]

**Zones — pipeline**

| Lang | n | Acc. | Macro F1 | scenario F1 | action F1 | acceptation F1 |
|---|---|---|---|---|---|---|
| all | 30 | 0.9000 | 0.9019 | 0.8888 | 0.8695 | 0.9473 |
| darija_arab | 15 | 0.8666 | 0.8659 | 0.9090 | 0.8000 | 0.8888 |
| darija_latn | 15 | 0.9333 | 0.9267 | 0.8571 | 0.9230 | 1.0000 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[8, 1, 0], [1, 10, 0], [0, 1, 9]]

Missed danger lines (pipeline):

- `darija_latn` kolchi ghadi ykoun mzyan ila ma b9itch hna
- `darija_arab` حسن ليهم إلا مشيت وما رجعتش
- `darija_latn` safi, ghadi nmchi w ma ghadich trjaw tchoufoni

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
| all | 33 | 0.8787 | 0.7777 | 0.7777 | 0.7777 | 0.9166 | 0.9166 | 0.8472 |
| darija_arab | 16 | 0.8125 | 0.6000 | 0.7500 | 0.6666 | 0.9090 | 0.8333 | 0.7681 |
| darija_latn | 17 | 0.9411 | 1.0000 | 0.8000 | 0.8888 | 0.9230 | 1.0000 | 0.9244 |

Confusion (rows true, cols predicted): no_danger [22, 2] · danger [2, 7]

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

## Test sécurité (public + traduit + synthétique) (`safety_test`, n = 807)

8 sampled line(s) got no LLM answer (line missing in the answer or request failed): scored as the app does (ambiguous line → alert, otherwise the on-device card).

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
| all | 96 | 0.8645 | 0.8070 | 0.9583 | 0.8761 | 0.9487 | 0.7708 | 0.8633 |
| darija_arab | 24 | 0.8333 | 0.7857 | 0.9166 | 0.8461 | 0.9000 | 0.7500 | 0.8321 |
| darija_latn | 24 | 0.7083 | 0.6470 | 0.9166 | 0.7586 | 0.8571 | 0.5000 | 0.6950 |
| en | 24 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| fr | 24 | 0.9166 | 0.8571 | 1.0000 | 0.9230 | 1.0000 | 0.8333 | 0.9160 |

Confusion (rows true, cols predicted): no_danger [37, 11] · danger [2, 46]

Missed danger lines (pipeline):

- `darija_arab` ما بقى غير شوية لي كاين، السبب لي ريدت ما ماتش، هي تورط و ليزارد لي جرو، نقاو حياة ديال ريبتيلي، هاد السبب لي لعالم مازال كاين.
- `darija_latn` Katssawl 3la l9ta3 ola ssikkin?

## Test zones (synthétique) (`zones_test`, n = 249)

3 sampled line(s) got no LLM answer (line missing in the answer or request failed): scored as the app does (ambiguous line → alert, otherwise the on-device card).

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
| all | 108 | 0.9907 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.9907 | 0.4976 |
| darija_arab | 36 | 0.9722 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.9722 | 0.4929 |
| darija_latn | 36 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |
| fr | 36 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 0.5000 |

Confusion (rows true, cols predicted): no_danger [107, 1] · danger [0, 0]

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
| all | 107 | 0.7102 | 0.6702 | 0.8857 | 0.7500 | 0.3750 |
| darija_arab | 35 | 0.7142 | 0.6691 | 0.8333 | 0.7741 | 0.4000 |
| darija_latn | 36 | 0.6111 | 0.5559 | 0.8571 | 0.6857 | 0.1250 |
| fr | 36 | 0.8055 | 0.7827 | 0.9600 | 0.8000 | 0.5882 |

Confusion (rows true, cols predicted; scenario, action, acceptation): [[31, 1, 3], [0, 36, 0], [4, 23, 9]]

