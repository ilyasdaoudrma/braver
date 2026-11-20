# Data card — BRAVER zone dataset (D2, built 20 Nov 2026)

Three classes, BRAVER definitions (same text as the app prompt, `lib/server/prompts.ts`):
`scenario` (a prediction or an interpretation), `action` (a real problem the person can act on), `acceptation`
(real and out of their control). Used to train the on-device zone model (M2), which replaces the prototype's keyword rules.

## Sources

**All rows are synthetic** (`source=synthetic`): no public dataset has these labels, and
`danthareja/cognitive-distortion` has no licence on its card, so it is not used.

- `generate.py` — short first-person worries of Moroccan students, written directly in `fr`, `darija_latn` and
  `darija_arab`, 5 themes (university, family, money/scholarship/transport, friends/love, internship/future) × 3 zones.
  Generator: `openai/gpt-oss-120b` for 38 batches of 15 (566 worries); when it hit its **200k tokens/day** limit on 20 Nov, the
  remaining 35 acceptation worries were written by `qwen/qwen3.8-27b` (5 per call, column `generator` in the interim file).
  The generation intent is *not* the label.
- `label.py` — two different models label every worry **blind** (they see only the French text and the zone
  definitions): `qwen/qwen3.8-27b` gives the final `label`, `openai/gpt-oss-safeguard-20b` gives a second opinion.
  The plan was gpt-oss-120b + qwen; the 120b was out of daily tokens, and the app's gpt-oss-20b is never used for data.

## Agreement (AI vs AI — not a human check)

| Measure | Value |
|---|---|
| Groups with both AI labels | 559 of 601 (the safeguard model returned no label for 42) |
| Agreement qwen vs gpt-oss-safeguard-20b | 0.9284 |
| Cohen's kappa qwen vs safeguard | 0.8880 |
| Agreement qwen vs generation intent | 0.9266 |

Confusion (rows = qwen, columns = safeguard; scenario, action, acceptation):
scenario [198, 0, 3] · action [5, 227, 15] · acceptation [15, 2, 94].

All labels (both AIs, generator, intent): `data/processed/labelled.csv`.

`data/to_check_100.csv` = 100 random worries (seed 42) with both AI labels and an empty `human_label` column, for
Ilyas to verify by hand. Until then, **no human has checked these labels**.

## Counts

601 worries × 3 languages = 1,803 rows. Every worry exists in fr, darija_latn and darija_arab with the same label.

| Label (qwen) | per language | total rows |
|---|---|---|
| scenario | 206 | 618 |
| action | 251 | 753 |
| acceptation | 144 | 432 |

Splits (rows over the 3 languages): train 1,284 (428 groups) · val 270 (90 groups) · **test 249 (83 groups: 33 scenario, 37 action, 13 acceptation per language)**. 7 test groups that were near-duplicates of a train/val worry (French char n-gram cosine > 0.7) were moved to train.
516 of 601 groups are "clean" (intent = qwen = safeguard).

## Splits

70/15/15 by group (one worry and its two translations stay together), seed 42. **Test** groups are drawn only
from the groups where the generation intent, qwen and the safeguard model all agree (the cleanest labels),
stratified by label; train/val take the rest. Then any test group whose French text is a near-duplicate (char n-gram cosine > 0.7) of a train/val worry moves to train.
`data/splits/test.csv` — sha256 `299ad024d35935862a85fc4cda0c709a3008d2d8e7820d9a800947748ce00fc1`.

## Known biases and limits

- Everything is written by LLMs: the worries are cleaner, more typical and more balanced than real messages.
  Darija spelling is regular; real code-switching and typos are rarer than in real life.
- The test split keeps only the easiest (unanimous) cases, so test scores are an **upper bound** for real use.
- Labels come from an LLM, checked by another LLM; ambiguous worries ("je n'ai pas été prise au master") can
  legitimately belong to two zones.
- Two generators (120b, qwen) with different styles.
- Labels are given on the **French** text and copied to the two Darija versions of the same worry; nobody checked
  that every translation kept the exact meaning (spot-checked by reading samples only).
- The safeguard model gave no label for 42 worries (33 of them acceptation); they can be in train/val, never in
  test, so test has fewer acceptation worries (13 per language).
- The second labeller (gpt-oss-safeguard-20b) is from the same family as the main generator (gpt-oss-120b), so
  the AI-AI agreement may be optimistic.
