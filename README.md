# BRAVER — Not fearless. Just braver.

Application de prévention pour les jeunes : on vide sa tête (français, darija en lettres latines ou arabes, ou à la voix), l'IA range chaque inquiétude en **Scénario / Action / Acceptation**, et la sécurité passe avant tout.

## Ce qui est dans l'app

| Écran | Ce qu'il fait |
|---|---|
| **Vide ta tête** | Une inquiétude par ligne, dictée vocale (français / darija), bouton « Charger l'exemple » (Yassine). |
| **Le tri** | Cartes dans 3 zones, avec le « pourquoi ». Déplacement d'un clic ou par glisser-déposer. Mode **Doux / Direct** (ironie seulement sur les scénarios, bloquée sur les sujets sensibles). |
| Carte Scénario | Prédiction + question pour vérifier + certitude (%) → « Noter ma prédiction » (Replay). |
| Carte Action | Une étape de moins de 15 min, curseur de peur 0–10, minuteur 10 min, « C'est fait ». |
| Carte Acceptation | Validation + ce qui reste sous contrôle + exercice en 3 temps (reconnaître, respirer, revenir). |
| **Mon Replay** | Prédictions à vérifier, comparaison avant / après, **score de calibration** (« sûr à 90 % → le pire est arrivé 1 fois sur 8 »), petites étapes faites. |
| **Besoin d'aide maintenant** | Écran de sécurité : message prêt (SMS / WhatsApp / copie), numéros d'urgence, bouton « On s'est mal compris ». |
| Plus → **Résumé pour un professionnel** | Une page imprimable, avec accord, calculée sur le téléphone (option : reformulée par l'IA). |
| Plus → **Labo** | Mesure du moteur sur les 21 phrases du dossier, sur **24 phrases écrites à l'aveugle**, ou sur vos propres phrases (`phrase | zone`). Bouton « Copier le résultat pour le pitch ». |

Sécurité à deux niveaux : un **filtre local** (mots-clés FR / darija / arabe + variantes 3-7-9) tourne avant tout appel réseau ; les expressions ambiguës (« ce partiel va me tuer ») sont tranchées par l'IA, ou déclenchent l'alerte si l'IA est indisponible. Si l'IA ne répond pas, des **règles locales** prennent le relais : la démo ne plante jamais.

Données : pas de compte, pas de base de données. Le journal reste dans le navigateur (localStorage avec accord, sinon session seulement) et s'efface d'un bouton.

## Lancer en local

```bash
npm install
```

Créer un fichier `.env.local` (voir `.env.example`) avec **une** des deux clés :

```
GEMINI_API_KEY=...          # gratuit, sans carte : https://aistudio.google.com/apikey
ANTHROPIC_API_KEY=sk-ant-...  # Claude (payant), prioritaire si présent
```

```bash
npm run dev
```

Ouvrir http://localhost:3000. Sans clé, tout marche en règles locales (le bas de page l'indique).

## Mettre en ligne sur Vercel

```bash
npx vercel
```

Puis, dans le tableau de bord Vercel du projet : **Settings → Environment Variables** → ajouter `GEMINI_API_KEY` (ou `ANTHROPIC_API_KEY`). Redéployer :

```bash
npx vercel --prod
```

Variables optionnelles : `GEMINI_MODEL` (par défaut : `gemini-3.5-flash`, puis `gemini-3.5-flash-lite` et `gemini-flash-lite-latest` si le premier est saturé — `gemini-3.8-flash` et `gemini-3.7-flash` étaient saturés ou trop lents sur l'offre gratuite le 19/11/2026), `BRAVER_MODEL` (Claude, par défaut `claude-opus-5-5`) et `BRAVER_EFFORT` (par défaut `low`).
Avec l'offre gratuite de Google, les textes envoyés peuvent servir à améliorer leurs produits : n'utiliser que des phrases de test. L'offre gratuite limite aussi le nombre de requêtes par minute (le Labo espace ses appels).
En ligne : https://braver-app.vercel.app

## Le jour J

1. Ouvrir l'app, vérifier en bas : « Moteur : IA · gemini-… » (point vert).
2. **Labo** → « 24 phrases écrites à l'aveugle » → moteur **IA** → « Lancer le test » (≈ 6 min) → « Copier le résultat pour le pitch ». Mesure du 19/11/2026 (Gemini 3.5 Flash) : 18/19 bons tris, 5/5 dangers, 0 fausse alerte. Les 24 phrases ont été écrites par une IA séparée qui n'avait vu ni les règles ni la liste du dossier.
3. Plan B réseau : cocher « Passer en règles locales » en bas de page.

Liens utiles pour la démo et les captures (données de démo, sans réseau) :
`/?shot=tri&mode=direct` · `/?shot=replay` · `/?shot=aide` · `/?shot=resume` · `/?shot=labo&set=aveugle`

## Structure

```
index.html, css/, js/          interface (sans build)
js/engine.js                   filtre de sécurité, appel IA, règles locales, garde-fous
js/data.js                     exemple, numéros, mots-clés, phrases de test
api/sort.js, replay.js, summary.js, health.js   fonctions serveur (Vercel)
api/_prompts.js                instructions du modèle (tri, Replay, résumé) + schémas JSON
dev-server.mjs                 serveur local qui reproduit Vercel (npm run dev)
```

Ni diagnostic, ni thérapie : un outil de prévention inspiré de la TCC et de l'ACT, à évaluer avec des professionnels.

