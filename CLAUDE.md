# BRAVER — rules for every coding agent (Claude Code, Antigravity, Codex)

Read this file, then `docs/ROADMAP.md` (plan, owners, datasets), then `docs/REVIEW.md` (what was wrong in the first prototype) before writing code. These three files are the source of truth.

## The project

BRAVER is a mental-health **prevention** web app for young people in Morocco (hackathon in Oujda, **22 November 2026**, feature freeze **21 Nov 15:00**).
The user writes what worries them (French, Darija in Latin or Arabic letters). AI sorts each worry into one zone:

- **scenario**: a prediction or interpretation → note the prediction + certainty, compare later with what happened (**Replay**)
- **action**: a real problem they can act on → one step of under 15 minutes
- **acceptation**: real and out of their control → acknowledge, then one thing still in their control

A **safety screen** stops everything when a message suggests danger (suicidal ideas, self-harm, violence suffered, immediate danger).
Platform around it: onboarding + consent, home with mood check-in, dashboard 24 h / 7 d / 30 d, breathing exercise, weekly GAD-7, reading cards, and a **Labo** page that shows the measured model performance.

Team coding: **Ilyas** (Claude Code) and **Ayoub** (Antigravity). Both do ML + backend + screens; tasks are split by feature (see ROADMAP).

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**, deployed on Vercel. API = Route Handlers in `app/api/*/route.ts`.
- **LLM: Groq, `openai/gpt-oss-20b`**, fallback `openai/gpt-oss-120b`, then the on-device trained models. Groq is OpenAI-compatible (`https://api.groq.com/openai/v1`). Use structured outputs (`response_format` json_schema) if Groq supports it for gpt-oss, else `json_object` + schema validation with **zod**. `reasoning_effort: "low"` for the sort. Timeout 8 s per try. Key: `GROQ_API_KEY`.
- **No Gemini.** Remove every Gemini path from the old code.
- **ML training in Python** under `ml/` (pandas, scikit-learn), **inference in the browser** in TypeScript from exported JSON weights. A parity test must prove TS and Python give the same probabilities (|Δ| < 1e-6) on 50 sample texts.
- Data stays **on the device** (localStorage with consent, else sessionStorage). No account, no database. Only the text being sorted is sent to Groq, without any identifier.
- The old prototype stays in `legacy/` for reference until everything is ported; do not edit it.

## Secrets

`GROQ_API_KEY` only in `.env.local` (git-ignored) and Vercel → Settings → Environment Variables. Never in code, commits, logs, screenshots, notebooks or chat messages. The CI scans for keys.

## Git workflow (GitHub cannot enforce it on this free private repo — you must)

1. Never push to `main` (only exception: none). One branch per issue: `feat/<ID>-<short-name>` (e.g. `feat/M1-safety-model`).
2. Start: `git switch main && git pull && git switch -c feat/...`.
3. Small conventional commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `data:`).
4. Before every push: `npm run lint && npm run typecheck && npm test && npm run build`. For `ml/`: `python -m pytest ml` passes. Click through what you changed at 375 px wide.
5. PR with `Closes #N`, a "How I tested" section, and for ML PRs the metrics table. CI must be green.
6. The other person reviews and merges. Merge at least twice a day, keep PRs small.
7. After any merge: `git pull`, then `git rebase main` on your branch.

## Files and ownership

- Screens: `app/(screens)/<name>/page.tsx` + components in `components/<name>/`. Only edit the screens of your own issues.
- **Shared files** (small separate PRs, say "shared:" in the title): `lib/store.ts`, `lib/types.ts`, `lib/groq.ts`, `app/layout.tsx`, `components/nav/*`, `tailwind.config.*`, `app/globals.css`, `package.json`.
- New store data = a new key with a default value; never rename a key.
- ML: `ml/safety/` (Ilyas), `ml/zones/` (Ayoub), `ml/eval/` (Ayoub), shared helpers in `ml/common/` (small PRs).
- Data: `ml/*/data/raw/` is git-ignored (downloaded sources). Commit processed splits only when the source licence allows it; always commit the download + cleaning scripts and a `DATA_CARD.md` (sources, licence, counts per class and language, cleaning steps, known biases).

## Product rules (non-negotiable)

- No diagnosis, no disorder names, no "tu vas réussir", "ne t'inquiète pas", "tout ira bien", "tu exagères". Keep a code-level guard that replaces these.
- **No irony mode.** Tone choice "Doux / Direct": Direct = shorter, more direct sentences, no jokes.
- Probabilities ("le pire est arrivé 1 fois sur 8") come **only** from the person's own Replay history, computed in code. The LLM never invents a probability.
- Safety first: keywords and the trained classifier run on the device **before** any network call. Ambiguous score → LLM decides; no network → alert. "Ce partiel va me tuer" must NOT alert; "bghit nmout", "ma bqitch baghi nfi9 sbah", "kayderbni" must alert. Hopelessness ("ma bqitch nchouf l9ima dyal rasi") → gentle check-in card with the help button.
- Safety screen: calm, no jokes, Moroccan numbers (19, 112, 15, 177, 2511 ONDE <18, 8350 Kolona Maak), ready message "J'ai besoin de te parler. Tu peux m'appeler ?", and "On s'est mal compris".
- Breathing: claim only "le soupir cyclique a amélioré l'humeur et ralenti la respiration (Stanford, 2023)". Never cortisol.
- GAD-7: score and trend only, never a diagnosis label; score ≥ 15 → calm suggestion to talk to a professional.
- **Metrics**: report accuracy, precision, recall, F1 (per class + macro), confusion matrix, on a **held-out test set never used for training or prompt tuning**, per language, with the number of examples. For safety, recall on the danger class is the headline. Never round up, never report a number you did not measure.

## UI rules

Mobile first (375 px). No pure `#FFF` / `#000`. Palette from the prototype: paper `#EDF0F4`, ink `#131B2C`, scenario `#5B3FD6`, action `#B93D0A`, acceptation `#0B7065`, focus `#2D6CDF` (+ dark-mode tokens). Fonts: Bricolage Grotesque (titles), Atkinson Hyperlegible (text), IBM Plex Sans Arabic (Arabic). Icons: lucide-react only, no emoji. Every data view has loading, empty and error states. No blocking spinner over 1 s: show the on-device result first, then upgrade with the LLM result. Motion 150–300 ms ease-out, respect `prefers-reduced-motion`. Labels above fields, buttons say what happens. French UI, tutoiement.
