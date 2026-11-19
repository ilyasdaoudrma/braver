# BRAVER roadmap — 19 → 22 November 2026

Two people code: **Ilyas** and **Ayoub**. Both build front + back + AI. Tasks are split by feature so each person owns different files.
Every task = one GitHub issue = one branch = one pull request. IDs below match the issue titles.

## Timeline

| When | Ilyas | Ayoub |
|---|---|---|
| **19 Nov evening** | **F0 foundation** (must be merged first, ~2 h) | A1 shell + onboarding (new files only), start I4 training script |
| **20 Nov** | I1 fast + reliable AI, I3 memory | I4 safety classifier, A3 breathing, A4 GAD-7 |
| **21 Nov until 15:00** | A2 dashboard, I6 summary v2, A6 demo data | I5 eval v2 + Labo, A5 reading cards |
| **21 Nov 15:00** | **Feature freeze.** Both: bug fixes only, run the eval on the human test set, put numbers in the pitch, record the backup video, rehearse twice | same |
| **22 Nov** | Hackathon. Stop coding 2–3 h before the end | same |

If a task is late at freeze time, cut it; never ship it half-done into the demo.

Ask **Mossab or Soukaina** (not coding anymore) to collect **60+ test sentences written by people outside the team** before 21 Nov noon: French, Darija Latin, Darija Arabic, with a label `danger: oui/non` and the expected zone. Goes into `eval/sentences-humains.csv`.

---

## F0 — Foundation (Ilyas, first, blocks the rest)

- Split `js/app.js` into `js/router.js` + one file per screen in `js/screens/` (`vide.js`, `tri.js`, `replay.js`, `aide.js`, `plus.js`, `resume.js`, `labo.js`) + `js/screens/index.js` that lists the screens (adding a screen = one line there). Behaviour must stay identical: click through every screen before/after.
- `css/tokens.css`: move colours, spacing, radius, fonts into CSS variables (light + dark).
- **Remove irony** everywhere: prompt (`api/_prompts.js`), schema, `engine.js` fallback, UI toggle. Keep a tone choice "Doux / Direct" where Direct = shorter, more direct sentences, no jokes.
- Store API in `js/store.js`: add keys with defaults for `moods`, `gad7`, `breathing`, `embeddings`, `onboarded` (no renames).
- Add `npm test` (Node's built-in `node:test`) with first tests on `engine.js`: forbidden reassurance replaced, irony never present, "bghit nmout" → alert, "ce partiel va me tuer" → no alert.
- Done when: app behaves as before minus irony, tests pass, CI green.

## Ilyas

### I1 — Fast and reliable AI
- The sort shows the **local-rules result instantly**, then upgrades each card when the AI answers (small "IA ✓" badge). No blocking blur.
- Model chain: Claude (if `ANTHROPIC_API_KEY`) → `gemini-3.5-flash` → `gemini-3.5-flash-lite`; timeout 8 s per try; return which model answered and latency.
- `/api/health` reports provider, model, and last latency; footer shows it.
- Target: 90 % of sorts under 8 s on the deployed app. Measure 20 sorts and write the result in the PR.

### I3 — Memory (retrieval over the person's own history)
- New `/api/embed` (Gemini embeddings, or the configured provider) returns a vector for a text. Vectors are stored **on the device** with each worry (`store.embeddings`). No server storage.
- Before a sort, find the 3 most similar past worries by cosine similarity (≥ a threshold you tune) and send them with their Replay outcome to `/api/sort` as context.
- Card shows: "3ᵉ fois que tu as peur d'un entretien. Tu étais sûr à 85–90 %. Le pire est arrivé 0 fois sur 3." Numbers computed in code from Replay, never by the model.
- Works offline: if embeddings are unavailable, fall back to a word-overlap similarity.
- Tests: similarity ranking, outcome counting.

### A2 — Dashboard ("Suivi")
- One-tap mood check-in (5 levels + optional emotion chips), shown on the home screen.
- Toggle 24 h / 7 j / 30 j: mood line, worries per zone, small steps done, calibration chart, breathing sessions, GAD-7 trend.
- Empty state ("Pas encore assez de données — reviens après quelques jours"), loading and error states. No streaks that punish a missed day.

### I6 — Summary for a professional v2
- Uses 30 days: what weighs most (themes), predictions noted vs worst outcomes, steps done, GAD-7 trend, breathing use. Model rewrites in first person, facts only (existing `SUMMARY_SYSTEM`).
- Consent screen before generating; print / save as PDF; nothing sent anywhere unless the person shares it.

### A6 — Demo data
- "Charger la démo de Yassine" in Plus: 30 days of coherent fictional data (worries in 3 languages, Replays with certainty and outcomes, moods, 4 GAD-7, breathing sessions), clearly marked as fictional. "Effacer la démo" restores the empty app.

## Ayoub

### A1 — App shell, onboarding, consent
- Bottom nav: **Accueil · Vider · Replay · Suivi · Plus**. "Besoin d'aide maintenant" reachable from every screen.
- Onboarding: 3 short screens (what BRAVER does, what it is not, data stays on the phone) with **Passer** and **Suivant**, then the consent choice (keep on this phone / session only).
- Home screen: mood check-in slot (A2 fills it), "Vide ta tête" button, last Replay to complete.
- Uses `css/tokens.css`; loading/empty/error states; reduced-motion respected.

### I4 — Safety v2: trained on-device classifier
- `scripts/train-safety.mjs` trains a small classifier (character n-grams 2–5 + logistic regression, written in plain JS, no heavy library) on: the keyword list, the existing test sentences, and generated variants (spelling variants 3/7/9, Arabic/Latin Darija). Output: `js/safety-model.json` (weights) + a training report (`eval/safety-train-report.md`).
- `js/safety.js` runs: keywords → classifier → (if network) AI check. Any layer can raise the alert; ambiguous score band → AI decides; no network → alert.
- Hopelessness / worthlessness ("ma bqitch nchouf l9ima dyal rasi", "ma kayn ta chi faida") → not a full alert but a **gentle check-in card** ("Ça a l'air lourd. Tu veux en parler à quelqu'un ?") with the help button.
- Runs in < 10 ms on the phone. Tests for the must-alert and must-not-alert lists.

### I5 — Eval v2 and the Labo
- Labo runs the human test set (`eval/sentences-humains.csv`) on 3 configurations: **keywords only**, **keywords + classifier**, **keywords + classifier + AI**. Reports sensitivity (dangers caught), specificity (calm sentences left alone), zone accuracy, latency.
- "Copier pour le pitch" gives a table. Keep the old sets as secondary.
- Never train the classifier on the human test set (keep it held out).

### A3 — Breathing ("Respirer")
- Cyclic sighing: inhale, short second inhale, long exhale; animated circle; 2 or 5 minutes; optional vibration; "Passer".
- Mood before/after (one tap each), saved to `store.breathing`. Suggested from Acceptation cards and from the home screen.
- Copy: "Le soupir cyclique a amélioré l'humeur et ralenti la respiration dans une étude de Stanford (2023)." Nothing about cortisol.

### A4 — GAD-7 weekly ("Mon point de la semaine")
- 7 questions, 4 answers each, one per screen, Passer allowed. Score 0–21 and a trend line, **no diagnosis label**.
- If score ≥ 15: a calm card suggesting to talk to a professional, with a link to the summary and to the help screen.
- Reminder on the home screen when 7 days passed.

### A5 — Reading cards ("À lire")
- 6–8 short cards in `content/cartes/*.md` (one idea each: scénario, action, acceptation, rumination, demander de l'aide, sommeil avant un examen…), rendered with a tiny Markdown renderer (no library). Label each "À relire par un psychologue" until reviewed.
- Each sorted card links to the reading card of its zone.

## Both, 21 Nov after freeze

- Run I5 on the human set with the deployed model. Put the numbers in `docs/pitch` slide 8 (replace "24 phrases écrites par une IA").
- Update slides: add memory, dashboard, safety v2 comparison; remove irony slide (annex 12).
- Phone test of the full demo path 3 times; record the backup video; rehearse the pitch twice.
