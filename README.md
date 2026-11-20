# BRAVER — Not fearless. Just braver.

Application de prévention pour les jeunes au Maroc : on écrit ce qui inquiète (français, darija en lettres latines ou arabes), l'IA range chaque inquiétude en **Scénario / Action / Acceptation**, et la sécurité passe avant tout.

> Reconstruction en cours (hackathon d'Oujda, 22 novembre 2026). Règles : [CLAUDE.md](CLAUDE.md) · plan : [docs/ROADMAP.md](docs/ROADMAP.md) · défauts du prototype : [docs/REVIEW.md](docs/REVIEW.md) · Groq : [docs/GROQ.md](docs/GROQ.md).
> Le premier prototype (HTML/JS + Gemini) est gardé tel quel dans [`legacy/`](legacy/) comme référence.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4, déployé sur Vercel.
- LLM : Groq `openai/gpt-oss-20b`, repli `openai/gpt-oss-120b`, puis les modèles entraînés qui tournent sur le téléphone.
- ML : Python (`ml/`, pandas + scikit-learn), inférence dans le navigateur à partir de poids JSON.
- Données sur le téléphone seulement (localStorage avec accord, sinon sessionStorage). Pas de compte.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis coller GROQ_API_KEY (https://console.groq.com/keys)
npm run dev                  # http://localhost:3000
```

Vérifications avant chaque push :

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

ML (Python 3.11+) :

```bash
py -3.12 -m venv ml/.venv          # Windows ; ailleurs : python3 -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt
ml/.venv/Scripts/python -m pytest ml
```

## Où mettre quoi

```
app/(screens)/<écran>/page.tsx   écrans avec la barre du bas (accueil, vider, tri, replay, suivi, plus, respirer, gad7, cartes, labo)
app/(flow)/onboarding            écrans sans barre du bas
app/securite                     écran de sécurité (bouton « Besoin d'aide » sur chaque écran)
app/api/<nom>/route.ts           routes serveur (Groq) — I1
components/<écran>/              composants d'un écran ; components/nav = partagé
lib/types.ts, lib/store.ts       modèle de données + stockage sur le téléphone (partagés)
lib/use-store.ts                 hook React : const [moods, updateMoods] = useStoreValue("moods")
lib/groq.ts                      groqJSON({ system, user, schema }) → { data, model, ms } (serveur uniquement)
lib/guards.ts, lib/keywords.ts   garde-fous de sortie, mots-clés de sécurité
lib/helplines.ts                 numéros marocains + message prêt
ml/safety, ml/zones, ml/eval     données, entraînement, évaluation
tests/                           tests Vitest
```

Bon à savoir (Next 16.4) : `cacheComponents` est activé. Les écrans visités restent montés en arrière-plan (React `<Activity>`) : un état local survit à la navigation, les effets sont nettoyés puis relancés. Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next que tu ne connais pas.

Ni diagnostic, ni thérapie : un outil de prévention inspiré de la TCC et de l'ACT, à évaluer avec des professionnels.
