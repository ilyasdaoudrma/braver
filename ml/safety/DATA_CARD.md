# Data card — BRAVER safety dataset (D1, built 20 Nov 2026)

Binary label: `1 = danger` (suicidal ideas or plans, passive wish to be dead, self-harm, violence suffered, immediate danger),
`0 = no danger` (everyday worries, sadness without danger, figurative "this exam will kill me", general questions).
Used to train the on-device safety classifier (M1). The keyword layer and the LLM check stay in front of / after it.

## Sources and licences

| Source | Licence (dataset card) | What we take | Rows in final set |
|---|---|---|---|
| [`vibhorag101/suicide_prediction_dataset_phr`](https://huggingface.co/datasets/vibhorag101/suicide_prediction_dataset_phr) | MIT | 1,200 random rows per class (5–400 chars), English Reddit, label from the subreddit | 3,190 (incl. translations) |
| [`nvidia/Aegis-AI-Content-Safety-Dataset-2.0`](https://huggingface.co/datasets/nvidia/Aegis-AI-Content-Safety-Dataset-2.0) | CC-BY-4.0 | unsafe prompts in the "Suicide and Self Harm" category that a second model confirms as danger on their own (168 of 250, see step 5), 300 random safe prompts with no violated category | 1,043 (incl. translations) |
| Translations (`source=translated`) | derived from the two sources above | 500 short English rows sent, 499 came back → `fr`, `darija_latn`, `darija_arab` by `openai/gpt-oss-120b` on Groq; normalised duplicates and rejected groups dropped | 1,373 |
| Synthetic (`source=synthetic`) | generated for BRAVER | 358 short messages × 3 languages by `openai/gpt-oss-120b` (8 categories, see below) | 1,074 |

Not used: `jquiros/suicide` (no licence on the card); Arabic suicidality tweets (Abdulsalam et al. 2023) and AraDepSu
(no public download link checked within the time box). The processed splits are committed (`data/processed/all.csv`, `data/splits/*.csv`) under the licences declared on
the dataset cards (MIT by the dataset author vibhorag101; CC-BY-4.0 by NVIDIA, attribution above). The Reddit texts are
third-party posts: if their redistribution is a concern, delete those two folders and rebuild locally with the scripts. Raw downloads stay in
`data/raw/` (git-ignored).

Synthetic categories (45 groups each, 3 languages): `hyperbole` (0, figurative "kill / die" about exams, heat,
football…; 43 groups after de-duplication), `daily_worry` (0), `sad_not_danger` (0), `ideation` (1), `passive_wish` (1),
`self_harm` (1), `violence_suffered` (1), `immediate_danger` (1). They are labelled **synthetic** everywhere
(column `source`), never "hand-written".

## Counts (all splits)

| Language | no danger | danger | total |
|---|---|---|---|
| en | 1,492 | 1,368 | 2,860 |
| fr | 379 | 436 | 815 |
| darija_latn | 379 | 437 | 816 |
| darija_arab | 379 | 437 | 816 |
| **all** | **2,629** | **2,678** | **5,307** |

Splits: train 3,726 rows (2,253 groups) · val 774 rows (483 groups) · **test 807 rows (482 groups)**.

| Split × language | no danger | danger |
|---|---|---|
| test en | 224 | 205 |
| test fr | 59 | 67 |
| test darija_latn | 59 | 67 |
| test darija_arab | 59 | 67 |

## Pipeline (all scripts in `ml/safety/`, run with `ml/.venv/Scripts/python -I`)

1. `download.py` — downloads the two sources (needs `HF_TOKEN` in `.env.local`).
2. `clean.py` — strips URLs, @usernames, r/subreddits and `filler` padding; keeps 5–400 characters; drops exact and
   normalised duplicates (`ml/common/text.py`, identical to `lib/text.ts`); drops redacted Aegis prompts; samples with seed 42.
3. `translate.py` — 500 short English rows (≤ 220 chars, 250 per class) → 3 languages, batches of 10, strict JSON
   schema, cached in `data/cache/translate/`. 1 sentence came back without a translation and was dropped.
4. `synth.py` — synthetic hard cases (above), cached in `data/cache/synth/`.
5. `check_aegis.py` — Aegis categories describe the whole conversation, so some "danger" prompts are harmless on their own
   ("Okay, I can respect that."). `qwen/qwen3.8-27b` re-reads each Aegis danger prompt with the BRAVER danger definition;
   the 82 it rejects are dropped (with their translations), never flipped to "no danger".
6. `split.py` — merges everything, drops the rejected groups and rows where the `filler` padding survived, drops normalised duplicates across sources, splits **by group** 70/15/15,
   stratified by label × source, seed 42. A group = one source sentence and all its translations, so the same
   sentence never appears in train in one language and in test in another.

## Held-out test set

`data/splits/test.csv` — sha256 `f262e5c7dcbcf001a61718c483a3e81d452709582310640912b635113e158a73`.
Never used for training, for choosing C or for the thresholds (those use `val.csv`). Metrics must be reported
per language and per source, with n.

## Known biases and limits

- **Label noise**: Reddit labels come from the subreddit (r/SuicideWatch vs others), not from a reader. Some "danger"
  posts say nothing about danger. For the translated sample only, Reddit positives had to contain an explicit term
  (die, suicide, kill myself, cut, life…) — this makes the translated positives more explicit than real messages.
- The Reddit texts were already stop-word-stripped by the dataset author ("need end suffering want die"); the
  translator was asked to rebuild a natural sentence, which can add fluency the original did not have.
- **Machine translation / generation**: all French and Darija rows are produced by one LLM (gpt-oss-120b). Darija
  spelling is more regular than real texting; real Darija from Moroccan students is not in this set. The Darija
  numbers in the M1 report measure the model on **machine-written Darija**, not on real users.
- Synthetic rows carry the label of the category they were generated for; they were read in samples, not one by one.
- Aegis "safe" prompts are general requests to an assistant (recipes, code…), easier negatives than real worries.
- English dominates (54 % of rows). Violence suffered and immediate danger come only from synthetic data.
- No personal data: public posts were already anonymised by their authors; we remove URLs and usernames again.
