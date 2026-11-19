# Review of the current app (19 November 2026)

Tested live on https://braver-app.vercel.app (phone size and direct API calls) and read the code and the pitch deck.

## What is already good — keep it

- Clean three-zone sort with a JSON schema, a guard that strips forbidden reassurance, a local-rules fallback, and a two-level safety filter. Runs on a phone, works offline in local-rules mode.
- The safety screen (numbers, ready message, "On s'est mal compris").
- Replay with the calibration score, the action card with the fear slider and 10-minute timer, the summary for a professional, the Labo that measures the engine.
- Indirect danger caught live: "ma bqitch baghi nfi9 sbah" → alert. "Je l'ai déjà demandé 3 fois" → "On revient à la même question" works.
- The pitch deck is solid and honest (sources, annex on data and safety).

## Problems found (by severity)

1. **The demo can stall.** One full sort through the interface took **23.9 s** behind a blocking blur; one direct API call failed (`ai_failed`). The free Gemini tier keeps falling back from `gemini-3.5-flash` to `gemini-3.5-flash-lite`, so the measured "18/19" (done on Flash) is not the model the jury will see.
2. **Irony makes jokes about death language.** In direct mode, "ce partiel va me tuer" got "Un examen qui se transforme en arme létale, c'est un nouveau concept" and "Attention aux examens assassins". Also "Bravo pour ton don de voyance". The model also returned irony when the mode was *doux* (the client hides it, but the prompt is not respected). In front of psychologists this is a risk with no upside → remove the mode.
3. **Hopelessness is not flagged.** "rah mab9itch nchouf l9ima dyal rasi" (I no longer see my own worth) was sorted as *acceptation* with no alert and no gentle check-in.
4. **The "blind test" is not blind enough.** The 24 test sentences were written by another AI. A jury will ask; we need sentences written by real people outside the team, and the numbers must be re-measured on the model actually used.
5. **It is not yet the platform we planned.** Missing: memory across worries (the AI never uses the person's history), dashboard 24 h / 7 d / 30 d with mood check-in, breathing exercise (only "3 respirations" inside the acceptance card), weekly GAD-7, reading cards, onboarding.
6. **AI depth is thin for an AI hackathon.** One prompt + one fallback. Nothing trained, nothing retrieved, no measured comparison between configurations.
7. **Code shape blocks two people working at once.** `js/app.js` is 1,061 lines holding every screen → constant merge conflicts. No tests.

## What we change (decided 19 Nov, details in ROADMAP.md)

- Rebuild in **Next.js + TypeScript**; the prototype moves to `legacy/` as reference.
- LLM: **Groq `openai/gpt-oss-20b`** (fallback `gpt-oss-120b`), no Gemini.
- Two models **we train** (safety, zones) on public datasets translated to French and Darija, running on the phone, replacing the keyword "local rules".
- Model performance measured like a real ML project: accuracy, precision, recall, F1, confusion matrices, per language, on held-out public test splits and a hand-written Darija set; shown in the Labo and in a new deck.
- Platform: onboarding + consent, home with mood, dashboard, breathing, GAD-7, reading cards. Irony removed.
