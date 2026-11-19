# BRAVER — rules for every coding agent (Claude Code, Antigravity, Codex)

Read this file, then `docs/ROADMAP.md` (the plan and who owns what), then `docs/REVIEW.md` (what is wrong today) before writing code.

## The project

BRAVER is a mental-health **prevention** web app for young people in Morocco (hackathon in Oujda, **22 November 2026**).
The user writes what worries them (French, Darija in Latin or Arabic letters). The AI sorts each worry into one of three zones:

- **scenario**: a prediction or interpretation → note the prediction, then compare with what really happened (Replay)
- **action**: a real problem they can act on → one step of under 15 minutes
- **acceptation**: real and out of their control → acknowledge, then one thing still in their control

A **safety screen** stops everything when a message suggests danger (suicidal ideas, self-harm, violence suffered, immediate danger).
Around the core: a dashboard (24 h / 7 d / 30 d), a breathing exercise, reading cards, a weekly GAD-7, a one-page summary for a professional.

Team now coding: **Ilyas** and **Ayoub**. Both build the whole app; tasks are split by feature, not by layer (see `docs/ROADMAP.md`).

## Stack (do not change it)

- Plain HTML + CSS + ES modules in `index.html`, `css/`, `js/`. **No framework, no build step.** Do not migrate to React/Next.js: there is no time and the app already works.
- Serverless functions in `api/*.js` (Vercel). Shared code in `api/_lib.js`, prompts in `api/_prompts.js`.
- Local server: `npm run dev` → http://localhost:3000 (reproduces Vercel).
- Data stays **on the device** (localStorage with consent, else sessionStorage). No account, no database. Only the text being sorted (and texts being embedded) is sent to the AI, without any identifier.
- AI keys only in `.env.local` (git-ignored) and in Vercel → Settings → Environment Variables. **Never in the code, never in a commit, never in a screenshot.**

## How we work (Git)

1. Never push to `main`. One branch per task: `feat/<task-id>-<short-name>` (example `feat/I3-memory`).
2. Before starting: `git switch main && git pull`, then create your branch.
3. Small commits, conventional messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
4. Before pushing: `npm test` (when present) and `for f in $(git ls-files '*.js' '*.mjs'); do node --check "$f"; done`. Open the app with `npm run dev` and click through what you changed, on a phone-sized window.
5. Push, open a pull request with `Closes #<issue>` and a short "how I tested" section. CI must be green.
6. The other person reviews and merges (Ilyas reviews Ayoub, Ayoub reviews Ilyas). Merge at least twice a day; keep PRs small.
7. After a merge: everybody `git pull` and rebases their branch (`git rebase main`).

## Files and ownership (to avoid conflicts)

- Each screen lives in its own file in `js/screens/` (created by task F0). Only edit the screen files of your own tasks.
- **Shared files** — change them only in small, separate PRs and say so in the PR title: `js/store.js`, `js/router.js`, `js/screens/index.js`, `css/tokens.css`, `api/_lib.js`, `api/_prompts.js`, `index.html`, `package.json`.
- Adding a screen = a new file in `js/screens/` + **one line** in `js/screens/index.js`. Nothing else in shared files.
- New data in the store = a new key with a default value in `store.js`, never rename an existing key.

## Product rules (non-negotiable)

- No diagnosis, no disorder names, no "tu vas réussir", "ne t'inquiète pas", "tout ira bien", "tu exagères". The guard in `js/engine.js` replaces these; keep it.
- **No irony mode.** It was removed (task F0). Do not bring it back.
- A probability or "how often the worst happened" comes **only** from the person's own Replay history. The AI never invents a probability.
- Safety first: keyword filter and on-device classifier run **before** any network call; if the AI is unavailable, ambiguous danger phrases trigger the alert. "Ce partiel va me tuer" must NOT alert; "bghit nmout", "ma bqitch baghi nfi9 sbah" must alert.
- Safety screen: calm tone, no jokes, verified Moroccan numbers, "J'ai besoin de te parler. Tu peux m'appeler ?" ready to send, and the "On s'est mal compris" button.
- Breathing: claim only what is measured (cyclic sighing improved mood and lowered breathing rate, Balban et al., Cell Reports Medicine 2023). Never claim it lowers cortisol.
- GAD-7: show the score and its trend, never a diagnosis label.
- Only numbers we measured go in the pitch. Write `[X]` until measured.

## UI rules

- Mobile first (test at 375 px wide). No pure white `#FFF` or pure black `#000`. One accent colour per zone (keep the existing palette).
- Icons: one SVG set, no emoji as icons.
- Every data view has loading, empty and error states. No full-screen blocking spinner longer than 1 s: show the local result first, then upgrade it with the AI result.
- Motion 150–300 ms, ease-out, respect `prefers-reduced-motion`.
- Labels above fields, buttons say what happens ("Trier mes inquiétudes", not "OK").
- French UI text, tutoiement, simple words.
