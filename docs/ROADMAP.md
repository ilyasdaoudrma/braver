# BRAVER roadmap v2 — Next.js + Groq gpt-oss-20b + trained models — 19 → 22 Nov 2026

Two people code: **Ilyas** (Claude Code) and **Ayoub** (Antigravity). Each does data + training + backend + screens.
Every task = one GitHub issue = one branch = one PR. IDs match the issue titles. **Must** tasks first; **Could** tasks only if Musts are merged.

## Timeline

| When | Ilyas | Ayoub |
|---|---|---|
| **19 Nov night** | **F0** Next.js foundation (blocks screens) | **D2** zone dataset (in `ml/zones`, no conflict with F0) |
| **20 Nov morning** | **I1** Groq engine + non-blocking sort | **M2** zone classifier |
| **20 Nov afternoon** | **D1** safety dataset → **M1** safety classifier | **S2a** onboarding, home, mood, dashboard |
| **20 Nov evening** | Both: hand-label the Darija test set (150 sentences each, see "Test sets") | same |
| **21 Nov morning** | **S1** sort, safety, Replay screens | **E1** evaluation + Labo, **S2b** breathing, GAD-7, reading cards |
| **21 Nov 15:00** | **Feature freeze.** Final eval run on the deployed pipeline → `ml/eval/results/` → numbers + charts for the new deck. Backup video. Rehearse. | same |
| **22 Nov** | Hackathon. Stop coding 2–3 h before the end. | same |

Could (only if time): **I3** memory, PDF summary for a professional (not in scope unless Ilyas asks).

---

## Datasets (download with scripts, never by hand; check each licence/card first and write it in DATA_CARD.md)

Safety (danger vs no danger):
- `vibhorag101/suicide_prediction_dataset_phr` — https://huggingface.co/datasets/vibhorag101/suicide_prediction_dataset_phr (English Reddit, binary suicide / non-suicide, already cleaned)
- `jquiros/suicide` — https://huggingface.co/datasets/jquiros/suicide (English, binary, backup / extra)
- `nvidia/Aegis-AI-Content-Safety-Dataset-2.0` — https://huggingface.co/datasets/nvidia/Aegis-AI-Content-Safety-Dataset-2.0 (use only the "Suicide and Self Harm" category as positives + safe prompts as negatives; gated: accept terms on the page)
- Arabic suicidality tweets, Abdulsalam et al. 2023 (5,719 tweets, 1,429 suicidal) — paper https://arxiv.org/abs/2309.00246 (look for the data link on the arXiv page / "Code, Data and Media"; if not downloadable in 15 min, skip it)
- AraDepSu (depressed / suicidal / neutral Arabic tweets) — https://aclanthology.org/2022.wanlp-1.28 (same rule: skip if no public link)
- Hard negatives and Darija: the sentences already in `legacy/js/data.js` (21 dossier sentences + 24 "aveugle" sentences + keyword lists), hyperboles like "ce partiel va me tuer", "had l exam ghadi yqtelni".

Zones (scenario / action / acceptation): no public dataset has these labels, so we build one.
- `danthareja/cognitive-distortion` — https://huggingface.co/datasets/danthareja/cognitive-distortion (fortune-telling, mind reading, catastrophizing → **scenario** candidates)
- Non-danger posts from the safety datasets above (daily worries) as raw text for **action / acceptation** candidates.
- Labelling: `openai/gpt-oss-120b` on Groq proposes a zone with the BRAVER definitions; Ilyas and Ayoub **check by hand** a random 300 and report the agreement (%, Cohen's kappa). Only hand-checked rows go into the test set.

Languages: public data is mostly English / Arabic. Translate a stratified sample (e.g. 1,500 per task) to **French**, **Darija in Latin letters** and **Darija in Arabic letters** with `openai/gpt-oss-120b` (batches of 20, JSON output, cached on disk, respect Groq rate limits). Mark every row with `lang` and `source` (`original` / `translated` / `handwritten`).

## Test sets (held out — never used for training, prompt tuning or thresholds)

1. **Public test split**: stratified 15 % of each processed dataset (fixed seed 42), saved once in `ml/*/data/splits/test.csv`, with its hash written in the data card.
2. **Darija hand-written set**: 300 short sentences written and labelled by Ilyas and Ayoub (150 each), Latin and Arabic script, both tasks labelled (`danger` yes/no, `zone`). File `ml/eval/data/darija_handwritten.csv`. Write them **before** looking at model outputs.

Metrics are reported separately for each test set and each language.

---

## F0 — Next.js foundation (Ilyas, Must, first)

- Move the current app into `legacy/` (unchanged, for reference). Create Next.js App Router + TypeScript + Tailwind + ESLint at the root; scripts `dev`, `build`, `lint`, `typecheck`, `test` (Vitest).
- Port to TypeScript in `lib/`: `types.ts` (Zone, Worry, SortResult, ReplayEntry, Mood, Gad7Entry, BreathingSession, Settings), `store.ts` (localStorage with consent, all keys with defaults: worries, replays, moods, gad7, breathing, embeddings, settings, onboarded), `guards.ts` (forbidden-reassurance replacement, no irony), `keywords.ts` (from legacy data.js), `helplines.ts`.
- `lib/groq.ts`: one function `groqJSON({system, user, schema, model})` with 8 s timeout, fallback 20b → 120b, returns `{data, model, ms}`; zod validation.
- App shell: layout, fonts, Tailwind tokens (palette + dark mode), bottom nav **Accueil · Vider · Replay · Suivi · Plus**, "Besoin d'aide" button on every screen, empty placeholder pages for every screen so Ayoub can fill his.
- CI: lint, typecheck, test, build, key scan; `ml` pytest job.
- Done when: `npm run build` passes, all placeholder routes open, tests on guards and keywords pass.

## Ilyas

### I1 — Groq engine + non-blocking sort (Must)
- `app/api/sort/route.ts`, `app/api/replay/route.ts`, `app/api/health/route.ts` on Groq (`openai/gpt-oss-20b` → `openai/gpt-oss-120b`), prompts ported from `legacy/api/_prompts.js` **without irony**, zod schemas, input limits (12 lines, 500 chars).
- Client: the on-device result (safety model + zone model) appears instantly, then each card upgrades when Groq answers (badge "IA · gpt-oss-20b · 1.4 s"). If Groq fails → stays on-device, footer says so.
- Measure 30 sorts on the deployed app: p50 / p90 latency, % answered by 20b vs 120b vs on-device. Put the table in the PR.

### D1 — Safety dataset (Must)
- `ml/safety/download.py`, `clean.py` (dedupe, strip URLs/usernames, length 5–400 chars, balance classes), `translate.py` (FR + Darija Latin + Darija Arabic via gpt-oss-120b, cached), `split.py` (train/val/test 70/15/15 stratified by label × language, seed 42).
- `ml/safety/DATA_CARD.md` with sources, licences, counts per class × language, hash of the test file.

### M1 — Safety classifier + pipeline (Must)
- `ml/safety/train.py`: TF-IDF character n-grams (char_wb, 2–5, max ~20k features, lowercase + Arabic normalisation identical in TS) + LogisticRegression (class_weight balanced). Tune the threshold on **val** for recall ≥ 0.95 on danger. Report on **test**: accuracy, precision, recall, F1, confusion matrix, per language.
- Export `public/models/safety.json` (vocab, idf, coef, intercept, threshold, version). `lib/safety/model.ts` reproduces the exact features; `ml/safety/parity_cases.json` + a Vitest parity test.
- `lib/safety/pipeline.ts`: keywords → model → (ambiguous band or online) LLM check. Hopelessness → check-in card (separate small keyword list + model score band).

### S1 — Core screens (Must)
- **Vider**: textarea (one worry per line), dictation optional, "Charger l'exemple", "Trier mes inquiétudes".
- **Tri**: three zones, cards with "pourquoi", move a card ("Pas la bonne zone ?"), scenario card (prediction + certainty slider → "Noter ma prédiction"), action card (fear 0–10, 10-min timer, "C'est fait"), acceptation card (validation + control + "Respirer" link to Ayoub's breathing).
- **Sécurité**: full-screen calm screen (rules in CLAUDE.md).
- **Replay**: predictions to check, "Raconter ce qui s'est passé" → compare (LLM comment from /api/replay), calibration chart computed from the person's own entries.

### I3 — Memory (Could)
- First check `GET https://api.groq.com/openai/v1/models` for an embedding model; if one exists use it via `/api/embed`, else `@huggingface/transformers` in the browser with `Xenova/multilingual-e5-small` (lazy-loaded, only when the user opens a sort). Vectors stored on the device.
- Top-3 similar past worries + their Replay outcomes → context for /api/sort and a line on the card ("3ᵉ fois… le pire est arrivé 0 fois sur 3"), numbers computed in code.

## Ayoub

### D2 — Zone dataset (Must, start now in `ml/zones/`)
- `ml/zones/download.py`, `build.py` (scenario candidates from cognitive-distortion; action/acceptation candidates from daily-worry posts), `label.py` (gpt-oss-120b proposes a zone with the BRAVER definitions, JSON, cached), `translate.py` (same three languages), `split.py` (70/15/15 stratified, seed 42).
- Hand-check 300 random labelled rows with Ilyas → agreement % and Cohen's kappa in `ml/zones/DATA_CARD.md`.

### M2 — Zone classifier (Must)
- Same recipe as M1 (char n-grams + multinomial LogisticRegression), export `public/models/zones.json`, `lib/zones/model.ts`, parity test. This replaces the old keyword "local rules" as the offline sorter.
- Report accuracy, macro-F1, per-class precision/recall/F1, confusion matrix on test.

### E1 — Evaluation + Labo (Must)
- `ml/eval/run_pipeline.py` (or a Node script calling the deployed `/api/sort`) evaluates the **full pipeline as the app runs it** (keywords → safety model → gpt-oss-20b → fallbacks) on both held-out test sets: safety (accuracy, precision, recall, F1, confusion matrix, false-negative list) and zones (accuracy, per-class P/R/F1, macro-F1, 3×3 confusion matrix), per language, plus latency p50/p90 and which model answered. Respect Groq rate limits (sleep + resume from cache).
- Outputs: `ml/eval/results/<date>/metrics.json`, `METRICS.md` (tables ready for slides), PNG confusion matrices and bar charts (matplotlib, BRAVER palette).
- **Labo** page (`app/(screens)/labo`): shows the latest metrics.json (tables + confusion matrices), dataset sizes, test-set description, and a "Tester une phrase" box showing each pipeline layer's decision.

### S2a — Onboarding, home, mood, dashboard (Must)
- Onboarding: 3 short screens with **Passer** / **Suivant**, then consent (keep on this phone / session only).
- Accueil: one-tap mood check-in (5 levels + optional emotion chips), "Vide ta tête" button, last Replay to complete, GAD-7 reminder.
- Suivi (dashboard): toggle 24 h / 7 j / 30 j: mood line, worries per zone, steps done, calibration, breathing sessions, GAD-7 trend. Empty / loading / error states, no punishing streaks.
- Demo data: "Charger la démo de Yassine" (30 days, fictional, labelled) and "Effacer" in Plus.

### S2b — Breathing, GAD-7, reading cards (Must, cards Could)
- Respirer: cyclic sighing, animated, 2 or 5 min, optional vibration, Passer, mood before/after saved.
- GAD-7: one question per screen, 0–21 score, trend, no label, ≥ 15 → calm suggestion + help link.
- À lire (Could): 6–8 short cards in `content/cartes/*.md`, linked from each zone card, "À relire par un psychologue".

## After freeze (both)

Final E1 run on the deployed pipeline, commit results, export charts for the new deck (we build a new PowerPoint; the old one is in `docs/pitch/` for reference only). Phone test of the demo path 3×, backup video, rehearse twice.
