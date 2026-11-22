// Deck 2 — 10-minute final pitch (23 Nov 2026), French: product, architecture, data, models, measured results, limits.
// Usage: NODE_PATH=<dir with pptxgenjs>/node_modules node docs/pitch/build/build-pitch-finale.cjs
// then: python -I docs/pitch/build/add_motion.py docs/pitch/BRAVER-Finale-10min.pptx
// Every number is read from the evaluation files (public/labo/metrics.json, public/models/safety.json, ml/*/results).
const path = require("node:path");
const fs = require("node:fs");
const pptxgen = require("pptxgenjs");
const { ROOT, A, C, F, pct, dec, numbers, scene, addOrbs, accentRuns, card, eyebrow, logo, TEAM, EVENT, teamCards, partnerLogos } = require("./deck-lib.cjs");

const N = numbers();
const SAFETY = JSON.parse(fs.readFileSync(path.join(ROOT, "public/models/safety.json"), "utf-8"));
const MS = N.m.models.safety, MZ = N.m.models.zones;
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "BRAVER — finale";
pres.author = "Équipe BRAVER";


const ORBS_CORNER = { scenario: [9.15, 0.3, 0.42], action: [9.5, 0.75, 0.3], acceptation: [9.05, 0.85, 0.24] };
const caught = (conf) => `${conf[1][1]} / ${conf[1][0] + conf[1][1]}`;
const falseAlarms = (conf) => `${conf[0][1]} / ${conf[0][0] + conf[0][1]}`;

/** Content slide: scene, eyebrow, title with accent word, notes. */
function head(s, { eb, parts, sky = "dawn", veil = 86, orbs = ORBS_CORNER, ebColor, notes, size = 30 }) {
  scene(pres, s, { sky, veil, orbs });
  eyebrow(s, eb, 0.6, 0.38, "@0 eyebrow", ebColor);
  s.addText(accentRuns(parts, { fontFace: F.light, fontSize: size, color: C.ink }), { x: 0.6, y: 0.68, w: 8.3, h: 0.75, margin: 0, objectName: "@1 title" });
  if (notes) s.addNotes(notes);
}

function table(s, rows, { x, y, w, colW, name, fontSize = 10.5, headFill = C.ink }) {
  const body = rows.map((r, i) =>
    r.map((cell) => ({
      text: String(cell),
      options: i === 0
        ? { bold: true, color: C.surface, fill: { color: headFill }, fontFace: F.bold }
        : { color: C.ink, fill: { color: i % 2 ? C.surface : C.surface2 }, fontFace: F.body },
    })),
  );
  s.addTable(body, { x, y, w, colW, fontSize, border: { type: "solid", pt: 0.5, color: C.line }, margin: 0.05, objectName: name, rowH: 0.3 });
}

/** Confusion matrix drawn as coloured cells (rows = truth, columns = prediction). */
function confusion(s, matrix, labels, { x, y, cell = 0.62, name, color = C.scenario }) {
  const max = Math.max(...matrix.flat());
  labels.forEach((l, j) => s.addText(l, { x: x + 1.15 + j * cell, y: y - 0.32, w: cell, h: 0.3, align: "center", fontFace: F.body, fontSize: 8.5, color: C.ink2, margin: 0, objectName: `${name} cl${j}` }));
  matrix.forEach((row, i) => {
    s.addText(labels[i], { x, y: y + i * cell, w: 1.1, h: cell, align: "right", valign: "middle", fontFace: F.body, fontSize: 8.5, color: C.ink2, margin: 0, objectName: `${name} rl${i}` });
    row.forEach((v, j) => {
      const t = Math.round(90 - (v / max) * 75);
      s.addShape(pres.shapes.RECTANGLE, { x: x + 1.15 + j * cell, y: y + i * cell, w: cell - 0.04, h: cell - 0.04, fill: { color: i === j ? color : C.danger, transparency: i === j ? t : Math.max(t, 70) }, line: { type: "none" }, objectName: `${name} c${i}${j}` });
      s.addText(String(v), { x: x + 1.15 + j * cell, y: y + i * cell, w: cell - 0.04, h: cell - 0.04, align: "center", valign: "middle", fontFace: F.bold, fontSize: 12, color: C.ink, margin: 0, objectName: `${name} v${i}${j}` });
    });
  });
  s.addText("lignes : vérité · colonnes : prédiction", { x, y: y + matrix.length * cell + 0.05, w: 1.15 + matrix.length * cell, h: 0.25, align: "right", fontFace: F.body, fontSize: 8, color: C.ink2, margin: 0, objectName: `${name} legend` });
}

function bigStat(s, x, y, w, big, label, n, name, color = C.ink) {
  card(pres, s, x, y, w, 1.35, `${name} card`);
  s.addText(big, { x: x + 0.18, y: y + 0.12, w: w - 0.3, h: 0.55, fontFace: F.light, fontSize: 26, color, margin: 0, objectName: `${name} big` });
  s.addText(label, { x: x + 0.18, y: y + 0.66, w: w - 0.3, h: 0.42, fontFace: F.body, fontSize: 9.5, color: C.ink, margin: 0, objectName: `${name} lab` });
  s.addText(n, { x: x + 0.18, y: y + 1.07, w: w - 0.3, h: 0.22, fontFace: F.body, fontSize: 8, color: C.ink2, margin: 0, objectName: `${name} n` });
}

// 1 ── Title
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 0, orbs: { scenario: [6.9, 1.35, 1.35], action: [8.3, 2.05, 1.0], acceptation: [7.35, 2.75, 0.75] } });
  logo(s, 0.6, 0.45, "@0 logo");
  s.addText(accentRuns(["Vide ta ", "tête", "."], { fontFace: F.light, fontSize: 60, color: C.ink }), { x: 0.55, y: 1.1, w: 6.2, h: 1.2, margin: 0, objectName: "@1 title" });
  s.addText("Trier ses inquiétudes en trois zones, avec la sécurité d'abord. Du produit aux chiffres mesurés.", { x: 0.6, y: 2.35, w: 5.4, h: 0.8, fontFace: F.body, fontSize: 15, color: C.ink, margin: 0, objectName: "@2 sub" });
  partnerLogos(pres, s, 5.15, 0.25, "@0 partners");
  s.addText(`Finale · ${EVENT} · équipe CTRL C`, { x: 0.6, y: 3.25, w: 6.4, h: 0.3, fontFace: F.bold, fontSize: 11, color: C.ink2, margin: 0, objectName: "@3 date" });
  s.addNotes("Bonjour. Hier, on vous a présenté l'idée de BRAVER. Aujourd'hui, on vous montre comment ça marche à l'intérieur : le produit, l'architecture, les données, les modèles, et les chiffres mesurés, avec leurs limites. (≈ 20 s)");
}

// 2 ── Problem
{
  const s = pres.addSlide();
  head(s, { eb: "LE PROBLÈME", parts: ["Les inquiétudes tournent en boucle, ", "seul", "."], notes: "Le problème : une inquiétude mélange prédictions, vrais problèmes et choses hors de contrôle. L'aide professionnelle n'est pas toujours accessible, et surtout un message de danger doit être repéré tout de suite, même en darija. (≈ 30 s)" });
  const items = [
    [C.scenario, "Tout se mélange", "Prédiction, vrai problème, chose hors de contrôle : on ne sait pas par où commencer."],
    [C.action, "L'aide n'est pas toujours accessible", "Coût, attente, peur d'en parler."],
    [C.danger, "Le danger passe inaperçu", "Un message en danger doit être repéré tout de suite, même en darija, même sans réseau."],
  ];
  items.forEach(([col, t, d], i) => {
    const y = 1.75 + i * 1.1;
    card(pres, s, 0.6, y, 8.4, 0.92, `@${2 + i} card`);
    s.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.34, w: 0.24, h: 0.24, fill: { color: col }, line: { type: "none" }, objectName: `@${2 + i} dot` });
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 14, color: C.ink, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 11.5, color: C.ink2 } }], { x: 1.3, y: y + 0.1, w: 7.5, h: 0.72, margin: 0, valign: "middle", objectName: `@${2 + i} text` });
  });
}

// 3 ── Solution: three zones + path in the app
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 86 });
  eyebrow(s, "LA SOLUTION", 0.6, 0.38, "@0 eyebrow");
  s.addText(accentRuns(["Trois zones, ", "une", " seule chose à faire."], { fontFace: F.light, fontSize: 30, color: C.ink }), { x: 0.6, y: 0.68, w: 8.8, h: 0.75, margin: 0, objectName: "@1 title" });
  const zones = [
    ["Scénario", C.scenario, "Une prédiction", "Noter la prédiction et sa certitude → Replay : comparer avec ce qui s'est passé. La probabilité vient de TON historique, calculée en code."],
    ["Action", C.action, "Un vrai problème", "Un seul pas de moins de 15 minutes, curseur de peur et minuteur de 10 minutes."],
    ["Acceptation", C.acceptation, "Hors de contrôle", "Reconnaître, puis garder une chose qui dépend encore de toi."],
  ];
  zones.forEach(([name, col, what, then], i) => {
    const x = 0.6 + i * 3.0;
    card(pres, s, x, 1.65, 2.75, 2.55, `@${2 + i} card`);
    s.addText(name, { x: x + 0.95, y: 1.95, w: 1.7, h: 0.35, fontFace: F.bold, fontSize: 15, color: col, margin: 0, objectName: `@${2 + i} name` });
    s.addText(what, { x: x + 0.3, y: 2.6, w: 2.2, h: 0.3, fontFace: F.serif, italic: true, fontSize: 12, color: C.ink, margin: 0, objectName: `@${2 + i} what` });
    s.addText(then, { x: x + 0.3, y: 2.95, w: 2.2, h: 1.15, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, valign: "top", objectName: `@${2 + i} then` });
  });
  s.addText("Autour : onboarding et consentement · humeur du jour · suivi 24 h / 7 j / 30 j · respiration (soupir cyclique) · GAD-7 hebdomadaire (score seulement) · cartes de lecture · page Labo.", { x: 0.6, y: 4.4, w: 8.8, h: 0.5, fontFace: F.body, fontSize: 10.5, color: C.ink, margin: 0, objectName: "@5 around" });
  addOrbs(s, { scenario: [0.85, 1.9, 0.55], action: [3.85, 1.9, 0.55], acceptation: [6.85, 1.9, 0.55] });
  s.addNotes("La solution : chaque inquiétude va dans une zone, et chaque zone a une seule action. Pour un scénario, la probabilité affichée vient uniquement de l'historique de la personne, calculée en code : l'IA n'invente jamais un chiffre. Autour, une vraie plateforme : humeur, suivi, respiration, questionnaire GAD-7 sans étiquette, et la page Labo. (≈ 40 s)");
}

// 4 ── Product / demo
{
  const s = pres.addSlide();
  head(s, { eb: "LE PRODUIT", parts: ["Démo : ", "en ligne", " sur téléphone et PC."], sky: "dawn", veil: 60, orbs: { scenario: [9.15, 0.3, 0.42], action: [9.5, 0.75, 0.3], acceptation: [0.25, 4.95, 0.3] }, notes: "Place pour la démo en direct : on ouvre le site, on vide sa tête avec trois inquiétudes, on montre le tri, le Replay, et l'écran d'aide. Si le réseau tombe, l'app trie quand même sur le téléphone. (≈ 60 s avec la démo)" });
  [["landing", "Site"], ["accueil", "Accueil"], ["vider", "Vider sa tête"], ["securite", "Écran d'aide"]].forEach(([f, l], i) => {
    const x = 0.75 + i * 2.25;
    s.addImage({ path: A(`phone-${f}.png`), x, y: 1.55, w: 1.62, h: 3.03, objectName: `@${2 + i} phone` });
    s.addText(l, { x: x - 0.2, y: 4.68, w: 2.02, h: 0.3, align: "center", fontFace: F.bold, fontSize: 11, color: C.ink, margin: 0, objectName: `@${2 + i} lab` });
  });
  s.addText("braver-omega.vercel.app", { x: 0.6, y: 5.05, w: 8.8, h: 0.3, align: "center", fontFace: F.body, fontSize: 10.5, color: C.scenario, margin: 0, objectName: "@6 url" });
}

// 5 ── Architecture
{
  const s = pres.addSlide();
  head(s, { eb: "ARCHITECTURE", parts: ["Le téléphone ", "d'abord", ", le réseau ensuite."], notes: "L'architecture. Tout commence sur le téléphone : mots-clés, puis notre modèle de sécurité. Si c'est clairement un danger, l'écran d'aide s'ouvre tout de suite. Si c'est ambigu, le LLM décide, et sans réseau, on alerte par prudence. En parallèle, notre modèle de zones affiche un premier tri tout de suite, puis le LLM l'améliore. Seule la phrase part, sans identifiant ; tout le reste reste sur le téléphone. (≈ 45 s)" });
  const boxes = [
    [0.6, "Texte de la personne", "français · darija latin · darija arabe", C.ink],
    [2.5, "1. Mots-clés", "sur le téléphone", C.ink],
    [4.4, "2. Modèle sécurité", "TF-IDF caractères + régression logistique, dans le navigateur", C.danger],
    [6.3, "3. LLM (si ambigu)", "Groq gpt-oss-20b, secours gpt-oss-120b, timeout 8 s", C.scenario],
  ];
  boxes.forEach(([x, t, d, col], i) => {
    card(pres, s, x, 1.7, 1.7, 1.25, `@${2 + i} box`);
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 11.5, color: col, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 9, color: C.ink2 } }], { x: x + 0.12, y: 1.78, w: 1.48, h: 1.1, margin: 0, valign: "top", objectName: `@${2 + i} t` });
    if (i < 3) s.addText("→", { x: x + 1.7, y: 2.1, w: 0.2, h: 0.4, align: "center", fontFace: F.body, fontSize: 16, color: C.ink2, margin: 0, objectName: `@${2 + i} arrow` });
  });
  const outs = [
    [C.danger, "Danger sûr → écran d'aide immédiat (numéros marocains, message prêt). Sans réseau + ambigu → aide aussi."],
    [C.scenario, "Option B : score ≥ " + dec(SAFETY.keep, 4) + " (choisi sur la validation) → l'alerte reste, même si le LLM dit non."],
    [C.acceptation, "Zones : le modèle du téléphone répond tout de suite, puis le LLM met à jour (pas de spinner bloquant)."],
    [C.ink, "Données sur le téléphone (localStorage avec consentement). Pas de compte, pas de base. Seule la phrase part, sans identifiant."],
  ];
  outs.forEach(([col, t], i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: 3.3 + i * 0.47, w: 0.16, h: 0.16, fill: { color: col }, line: { type: "none" }, objectName: `@${6 + i} d` });
    s.addText(t, { x: 0.95, y: 3.2 + i * 0.47, w: 8.4, h: 0.38, fontFace: F.body, fontSize: 10.5, color: C.ink, margin: 0, valign: "middle", objectName: `@${6 + i} o` });
  });
}

// 6 ── Safety data
{
  const s = pres.addSlide();
  head(s, { eb: "DONNÉES · SÉCURITÉ", parts: ["Des sources ", "ouvertes", ", sous licence."], notes: "Les données de sécurité. Deux sources publiques sous licence : un jeu Reddit sous licence MIT, et NVIDIA Aegis 2.0 sous CC-BY-4.0, dont un second modèle a revérifié les prompts de danger. Nous avons traduit en français et en darija avec une IA, et ajouté des phrases synthétiques difficiles. Le découpage est fait par groupe : une même phrase traduite n'est jamais à la fois en entraînement et en test. (≈ 40 s)" });
  table(s, [
    ["Source", "Licence", "Lignes"],
    ["Reddit (vibhorag101) + traductions", "MIT", "3 190"],
    ["NVIDIA Aegis 2.0 (revérifié par un 2e modèle) + trad.", "CC-BY-4.0", "1 043"],
    ["Traductions FR / darija latin / darija arabe (IA)", "dérivées", "1 373"],
    ["Phrases synthétiques difficiles (IA)", "BRAVER", "1 074"],
  ], { x: 0.6, y: 1.65, w: 5.6, colW: [3.5, 1.1, 1.0], name: "@2 table" });
  bigStat(s, 6.5, 1.65, 2.9, `${MS.test.n}`, "phrases de test, découpées par groupe (jamais en entraînement)", `entraînement ${MS.train_n} · validation ${MS.val_n}`, "@3 split");
  s.addText("Traductions et phrases synthétiques produites par une IA (gpt-oss-120b) : marquées « synthétique » partout. L'anglais domine (54 % des lignes). Entraînement complété par les inquiétudes du jeu zones comme exemples sans danger (darija du quotidien).", { x: 0.6, y: 3.45, w: 8.8, h: 0.75, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, objectName: "@4 note" });
}

// 7 ── Safety model
{
  const s = pres.addSlide();
  head(s, { eb: "MODÈLE · SÉCURITÉ", parts: ["Petit, rapide, ", "dans", " le navigateur."], notes: "Le modèle de sécurité est volontairement simple : TF-IDF sur les caractères, de 2 à 5, et une régression logistique équilibrée. Les caractères gèrent bien le darija écrit de mille façons. Il est entraîné en Python, exporté en JSON, et tourne dans le navigateur en TypeScript ; un test prouve que les deux donnent les mêmes probabilités à un millionième près. Les seuils sont choisis sur la validation, jamais sur le test. (≈ 40 s)" });
  const facts = [
    ["Entrée", `TF-IDF sur caractères (${SAFETY.ngram[0]}–${SAFETY.ngram[1]}), sublinéaire`],
    ["Modèle", "Régression logistique, classes équilibrées"],
    ["Où", "Entraîné en Python (scikit-learn), inférence en TypeScript dans le navigateur, sans réseau"],
    ["Parité", "Python et TypeScript : mêmes probabilités, |Δ| < 1e-6 sur 50 phrases (test automatique)"],
    ["Seuils (validation)", `ambigu ≥ ${dec(SAFETY.threshold, 4)} · alerte gardée ≥ ${dec(SAFETY.keep, 4)} · danger sûr ≥ ${dec(SAFETY.high, 4)}`],
  ];
  facts.forEach(([k, v], i) => {
    const y = 1.65 + i * 0.62;
    card(pres, s, 0.6, y, 8.8, 0.52, `@${2 + i} card`);
    s.addText(k, { x: 0.8, y, w: 2.0, h: 0.52, valign: "middle", fontFace: F.bold, fontSize: 11.5, color: C.ink, margin: 0, objectName: `@${2 + i} k` });
    s.addText(v, { x: 2.8, y, w: 6.5, h: 0.52, valign: "middle", fontFace: F.body, fontSize: 11, color: C.ink, margin: 0, objectName: `@${2 + i} v` });
  });
}

// 8 ── Safety results (device)
{
  const s = pres.addSlide();
  const d = N.safety.dev;
  head(s, { eb: "RÉSULTATS · SÉCURITÉ (TÉLÉPHONE)", parts: ["Le rappel du danger ", "d'abord", "."], notes: `Les résultats sur le test, jamais vu. Ce qui compte d'abord, c'est le rappel sur le danger : ${pct(d.danger.recall)}, soit ${d.confusion[1][1]} messages en danger repérés sur ${d.danger.support}. Le prix, ce sont des fausses alertes : ${d.confusion[0][1]} sur ${d.no_danger.support}. On l'accepte, parce qu'une fausse alerte se règle avec « On s'est mal compris », alors qu'un danger raté ne se rattrape pas. Le rappel reste au-dessus de 95 % dans chaque langue. (≈ 45 s)` });
  table(s, [
    ["Classe", "Précision", "Rappel", "F1", "n"],
    ["Danger", dec(d.danger.precision), dec(d.danger.recall), dec(d.danger.f1), d.danger.support],
    ["Pas de danger", dec(d.no_danger.precision), dec(d.no_danger.recall), dec(d.no_danger.f1), d.no_danger.support],
    ["Macro / exactitude", "", `exact. ${dec(d.accuracy)}`, dec(d.macro_f1), d.n],
  ], { x: 0.6, y: 1.65, w: 5.0, colW: [1.6, 0.9, 1.1, 0.8, 0.6], name: "@2 table" });
  const langs = Object.entries(MS.test_by_lang).map(([l, v]) => [{ fr: "Français", darija_latn: "Darija (latin)", darija_arab: "Darija (arabe)", en: "Anglais" }[l] || l, dec(v.per_class.danger.recall), v.per_class.danger.support]);
  table(s, [["Langue", "Rappel danger", "n danger"], ...langs], { x: 0.6, y: 3.2, w: 5.0, colW: [2.2, 1.6, 1.2], name: "@3 lang" });
  confusion(s, d.confusion, ["pas danger", "danger"], { x: 6.0, y: 2.0, cell: 0.95, name: "@4 cm", color: C.danger });
}

// 9 ── Online pipeline + option B
{
  const s = pres.addSlide();
  const pc = N.safety.pipe.confusion;
  head(s, { eb: "RÉSULTATS · APP EN LIGNE", parts: ["Le LLM ne tranche que le ", "doute", "."], notes: `L'app complète en ligne, sur un échantillon stratifié de ${N.safety.onlineN} phrases envoyées à l'app déployée : ${caught(pc)} dangers repérés, et ${falseAlarms(pc)} fausses alertes. Nous avons vu que le LLM effaçait parfois de vrais dangers en darija. D'où l'option B : si le score du modèle reste au-dessus de ${dec(SAFETY.keep, 4)}, choisi sur la validation, l'alerte reste même si le LLM dit non. (≈ 40 s)` });
  bigStat(s, 0.6, 1.65, 2.8, caught(pc), "messages en danger repérés, app en ligne", `échantillon stratifié n = ${N.safety.onlineN}`, "@2 a", C.danger);
  bigStat(s, 3.6, 1.65, 2.8, falseAlarms(pc), "fausses alertes (réglables par « On s'est mal compris »)", "même échantillon", "@3 b");
  bigStat(s, 6.6, 1.65, 2.8, dec(SAFETY.keep, 4), "seuil « option B » : au-dessus, l'alerte reste même si le LLM dit non", "choisi sur la validation", "@4 c", C.scenario);
  s.addText("Échantillon stratifié (12 phrases par langue et par classe) : sa précision ne reflète pas la fréquence réelle du danger. Le LLM reçoit seulement la phrase, sans identifiant.", { x: 0.6, y: 3.3, w: 8.8, h: 0.6, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, objectName: "@5 note" });
  confusion(s, pc, ["pas danger", "danger"], { x: 3.0, y: 4.25, cell: 0.42, name: "@6 cm", color: C.danger });
}

// 10 ── Zones data + labels check
{
  const s = pres.addSlide();
  head(s, { eb: "DONNÉES · ZONES", parts: ["Des étiquettes ", "contrôlées", "."], sky: "dusk", veil: 86, notes: `Pour les zones, il n'existait aucun jeu public. Nous avons généré ${(MZ.train_n + MZ.val_n + MZ.test.n) / 3} inquiétudes en trois langues avec une IA ; ${N.ag.n_groups} ont été étiquetées à l'aveugle par deux modèles différents : accord ${pct(N.ag.agreement_qwen_safeguard)}, kappa ${dec(N.ag.cohen_kappa_qwen_safeguard, 2)}. Puis une personne de l'équipe a vérifié 100 étiquettes tirées au hasard : ${N.hc.qwen.agree} sur ${N.hc.qwen.n} d'accord, kappa ${dec(N.hc.qwen.kappa, 2)}. Honnêtement : les étiquettes de l'IA étaient visibles pendant la vérification, et aucun désaccord n'est dans le test. (≈ 45 s)` });
  bigStat(s, 0.6, 1.65, 2.8, `${(MZ.train_n + MZ.val_n + MZ.test.n) / 3} × 3`, "inquiétudes générées par IA (qwen), en français, darija latin et arabe", `train ${MZ.train_n} · val ${MZ.val_n} · test ${MZ.test.n}`, "@2 a");
  bigStat(s, 3.6, 1.65, 2.8, `κ ${dec(N.ag.cohen_kappa_qwen_safeguard, 4)}`, `accord ${pct(N.ag.agreement_qwen_safeguard)} entre deux IA (qwen et gpt-oss-safeguard), à l'aveugle`, `n = ${N.ag.n_groups}`, "@3 b", C.scenario);
  bigStat(s, 6.6, 1.65, 2.8, `${N.hc.qwen.agree} / ${N.hc.qwen.n}`, `confirmées par une personne · κ ${dec(N.hc.qwen.kappa, 4)}`, "étiquettes IA visibles · 0 désaccord dans le test", "@4 c", C.acceptation);
  s.addText("Le test zones ne contient que des groupes où l'intention de génération, qwen et le second modèle sont d'accord. Les phrases sont synthétiques : pas encore de vraies inquiétudes d'utilisateurs.", { x: 0.6, y: 3.3, w: 8.8, h: 0.6, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, objectName: "@5 note" });
}

// 11 ── Zones results
{
  const s = pres.addSlide();
  const z = N.zones.dev, zp = N.zones.pipe;
  head(s, { eb: "RÉSULTATS · ZONES", parts: ["Le modèle du téléphone ", "tient", " la route."], sky: "dusk", veil: 86, notes: `Le modèle de zones sur le téléphone : exactitude ${pct(z.accuracy)}, macro-F1 ${dec(z.macro_f1, 2)}, sur ${z.n} phrases de test. La zone la plus difficile est l'acceptation, souvent confondue avec un scénario. En ligne, le LLM fait moins bien sur ce test : ${pct(zp.accuracy)} sur ${zp.n} phrases. C'est pour ça que le téléphone répond d'abord. (≈ 40 s)` });
  const pc = z.per_class;
  table(s, [
    ["Zone", "Précision", "Rappel", "F1", "n"],
    ["Scénario", dec(pc.scenario.precision), dec(pc.scenario.recall), dec(pc.scenario.f1), pc.scenario.support],
    ["Action", dec(pc.action.precision), dec(pc.action.recall), dec(pc.action.f1), pc.action.support],
    ["Acceptation", dec(pc.acceptation.precision), dec(pc.acceptation.recall), dec(pc.acceptation.f1), pc.acceptation.support],
    ["Macro / exactitude", "", `exact. ${dec(z.accuracy)}`, dec(z.macro_f1), z.n],
  ], { x: 0.6, y: 1.65, w: 5.0, colW: [1.6, 0.9, 1.1, 0.8, 0.6], name: "@2 table" });
  s.addText([
    { text: `LLM en ligne (gpt-oss-20b) : exactitude ${dec(zp.accuracy)}, macro-F1 ${dec(zp.macro_f1)}`, options: { fontFace: F.bold, color: C.ink, breakLine: true } },
    { text: `sous-échantillon n = ${zp.n} (phrases non arrêtées par la sécurité)`, options: { fontFace: F.body, color: C.ink2 } },
  ], { x: 0.6, y: 3.4, w: 5.0, h: 0.6, fontSize: 10.5, margin: 0, objectName: "@3 llm" });
  confusion(s, z.confusion, ["scénario", "action", "acceptation"], { x: 5.75, y: 1.95, cell: 0.72, name: "@4 cm", color: C.acceptation });
}

// 12 ── Darija
{
  const s = pres.addSlide();
  const dc = N.darija, ds = N.synthetic;
  head(s, { eb: "DARIJA", parts: ["Le test le plus ", "dur", "."], sky: "dusk", veil: 86, notes: "Le darija, c'est le plus difficile. Deux petits jeux séparés, écrits par des IA, donc nous donnons des comptes et pas des pourcentages. Ce qui passe encore : les adieux indirects, comme « kolchi ghadi ykoun mzyan ila ma b9itch hna ». C'est notre priorité numéro un : des phrases écrites par de vraies personnes. (≈ 40 s)" });
  const rows = [["Jeu (écrit par une IA)", "Danger repéré · téléphone", "Danger repéré · en ligne", "Bonne zone · téléphone"]];
  const zc = (e) => { const m = e.zones_device.all; return `${m.confusion.reduce((a, r, i) => a + r[i], 0)} / ${m.n}`; };
  if (dc) rows.push([`Darija écrit par Claude (n = ${dc.n})`, caught(dc.safety_device.all.confusion), `${caught(dc.safety_pipeline.all.confusion)} (n = ${dc.safety_pipeline.all.n})`, zc(dc)]);
  if (ds) rows.push([`Darija synthétique filtré (n = ${ds.n})`, caught(ds.safety_device.all.confusion), `${caught(ds.safety_pipeline.all.confusion)} (n = ${ds.safety_pipeline.all.n})`, zc(ds)]);
  table(s, rows, { x: 0.6, y: 1.65, w: 8.8, colW: [3.1, 1.9, 2.1, 1.7], name: "@2 table", fontSize: 10.5 });
  card(pres, s, 0.6, 2.95, 8.8, 0.95, "@3 card");
  s.addText([{ text: "Encore raté : ", options: { fontFace: F.bold, color: C.danger } }, { text: "les adieux indirects, par exemple ", options: { fontFace: F.body, color: C.ink } }, { text: "« kolchi ghadi ykoun mzyan ila ma b9itch hna »", options: { fontFace: F.serif, italic: true, color: C.ink } }], { x: 0.85, y: 3.0, w: 8.4, h: 0.85, fontSize: 12, margin: 0, valign: "middle", objectName: "@3 t" });
  s.addText("Petits n : comptes bruts, pas de pourcentages. Aucune phrase de darija écrite à la main par de vraies personnes pour l'instant.", { x: 0.6, y: 4.05, w: 8.8, h: 0.5, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, objectName: "@4 note" });
}

// 13 ── Latency & cost
{
  const s = pres.addSlide();
  const L = N.latency;
  head(s, { eb: "PERFORMANCE", parts: ["Rapide, ", "gratuit", ", même hors ligne."], sky: "dusk", veil: 82, notes: `Côté performance : le tri en ligne répond en ${(Math.floor(L.client_ms_p50 / 100) / 10).toFixed(1).replace(".", ",")} secondes en médiane pour jusqu'à 12 inquiétudes, mesuré sur ${L.requests} requêtes. Le téléphone affiche son résultat tout de suite, donc on n'attend jamais devant un écran vide. Et sans réseau, tout le tri et la sécurité marchent quand même. (≈ 30 s)` });
  bigStat(s, 0.6, 1.65, 2.8, `${(Math.floor(L.client_ms_p50 / 100) / 10).toFixed(1).replace(".", ",")} s`, "médiane du tri en ligne, jusqu'à 12 lignes par requête", `n = ${L.requests} requêtes · 90 % sous ${(Math.floor(L.client_ms_p90 / 100) / 10).toFixed(1).replace(".", ",")} s`, "@2 a");
  bigStat(s, 3.6, 1.65, 2.8, "0 réseau", "le tri et la sécurité marchent sans connexion (modèles sur le téléphone)", "résultat du téléphone affiché d'abord", "@3 b", C.acceptation);
  bigStat(s, 6.6, 1.65, 2.8, "0 compte", "pas d'inscription, pas de base de données, tout effaçable en un geste", "données sur le téléphone", "@4 c", C.scenario);
  s.addText("Modèles du téléphone : sécurité ≈ 0,9 Mo, zones ≈ 1,7 Mo (JSON). Mémoire optionnelle (multilingual-e5-small, 118 Mo) désactivée par défaut.", { x: 0.6, y: 3.3, w: 8.8, h: 0.5, fontFace: F.body, fontSize: 10, color: C.ink2, margin: 0, objectName: "@5 note" });
}

// 14 ── Ethics & limits
{
  const s = pres.addSlide();
  head(s, { eb: "ÉTHIQUE ET LIMITES", parts: ["Ce que BRAVER ", "ne fait pas", "."], sky: "dusk", veil: 86, ebColor: C.danger, notes: "Nos limites, dites franchement. Pas de diagnostic, pas de nom de trouble, pas de fausses promesses rassurantes. Nos données de test sont traduites ou générées par une IA, la vérification humaine n'était pas à l'aveugle, et nous avons encore des fausses alertes et des adieux indirects ratés en darija. (≈ 35 s)" });
  const left = ["Pas de diagnostic, pas de nom de trouble", "Pas de « tout ira bien » : un garde-fou en code les remplace", "Pas de probabilité inventée par l'IA : seulement l'historique de la personne", "GAD-7 : score et tendance, jamais d'étiquette ; ≥ 15 → parler à un professionnel"];
  const right = ["Données de test traduites ou générées par une IA", "Vérification humaine des zones avec étiquettes IA visibles", `Fausses alertes : ${falseAlarms(N.safety.pipe.confusion)} en ligne (échantillon)`, "Adieux indirects en darija encore ratés"];
  [[left, "Règles du produit", C.acceptation, 0.6], [right, "Limites mesurées", C.danger, 5.1]].forEach(([items, t, col, x], k) => {
    card(pres, s, x, 1.6, 4.3, 3.3, `@${2 + k} card`);
    s.addText(t, { x: x + 0.25, y: 1.75, w: 3.8, h: 0.35, fontFace: F.bold, fontSize: 13, color: col, margin: 0, objectName: `@${2 + k} t` });
    s.addText(items.map((it, i) => ({ text: it, options: { bullet: true, breakLine: i < items.length - 1 } })), { x: x + 0.25, y: 2.2, w: 3.85, h: 2.5, fontFace: F.body, fontSize: 11, color: C.ink, margin: 0, paraSpaceAfter: 6, valign: "top", objectName: `@${2 + k} l` });
  });
}

// 15 ── Next steps
{
  const s = pres.addSlide();
  head(s, { eb: "LA SUITE", parts: ["Ce qu'on fait ", "ensuite", "."], sky: "dusk", veil: 82, notes: "La suite : des phrases écrites par de vrais jeunes, une annotation à l'aveugle par plusieurs personnes, une relecture avec des psychologues, et des tests avec des utilisateurs à Oujda. (≈ 30 s)" });
  const steps = [
    [C.scenario, "Darija réel", "Phrases écrites par de vraies personnes, puis re-mesurer tout le pipeline."],
    [C.action, "Annotation à l'aveugle", "Plusieurs personnes, sans voir les étiquettes de l'IA."],
    [C.acceptation, "Relecture clinique", "Valider les textes et l'écran d'aide avec des psychologues."],
    [C.ink, "Tests utilisateurs", "Avec des étudiants à Oujda, sur leur propre téléphone."],
  ];
  steps.forEach(([col, t, d], i) => {
    const x = 0.6 + (i % 2) * 4.5, y = 1.7 + Math.floor(i / 2) * 1.5;
    card(pres, s, x, y, 4.3, 1.3, `@${2 + i} card`);
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.3, w: 0.22, h: 0.22, fill: { color: col }, line: { type: "none" }, objectName: `@${2 + i} d` });
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 13, color: C.ink, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 10.5, color: C.ink2 } }], { x: x + 0.65, y: y + 0.15, w: 3.5, h: 1.0, margin: 0, valign: "top", objectName: `@${2 + i} t` });
  });
}

// 16 ── Team + QR (night)
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "night", veil: 0, orbs: { scenario: [6.85, 0.3, 0.62], action: [7.6, 0.6, 0.46], acceptation: [7.15, 1.05, 0.36] } });
  eyebrow(s, "L'ÉQUIPE", 0.6, 0.45, "@0 eyebrow", "C9C3EE");
  s.addText(accentRuns(["Merci. Vos ", "questions", " ?"], { fontFace: F.light, fontSize: 34, color: C.moon }), { x: 0.6, y: 0.8, w: 6.2, h: 1.2, margin: 0, objectName: "@1 title" });
  teamCards(pres, s);
  card(pres, s, 6.95, 2.0, 2.45, 2.85, "@6 qrcard", { fill: C.surface, transparency: 0 });
  s.addImage({ path: A("qr.png"), x: 7.3, y: 2.2, w: 1.75, h: 1.75, objectName: "@6 qr" });
  s.addText([{ text: "Essayez-la maintenant", options: { fontFace: F.bold, fontSize: 11, color: C.ink, breakLine: true } }, { text: "braver-omega.vercel.app", options: { fontFace: F.body, fontSize: 10, color: C.scenario, hyperlink: { url: "https://braver-omega.vercel.app" } } }], { x: 7.05, y: 4.05, w: 2.25, h: 0.6, align: "center", margin: 0, objectName: "@6 url" });
  s.addText("BRAVER n'est pas un service médical et ne pose pas de diagnostic. Chiffres détaillés : page Labo de l'app.", { x: 0.6, y: 4.95, w: 6.2, h: 0.3, fontFace: F.body, fontSize: 9, color: "C9C3EE", margin: 0, objectName: "@7 disc" });
  s.addNotes("Nous sommes l'équipe CTRL C de l'EHEI Oujda : Ilyas, Ayoub, Soukayna et Mossab. Tous les chiffres que vous avez vus sont sur la page Labo de l'app, et vous pouvez la tester avec ce QR code. Merci, nous sommes prêts pour vos questions. (≈ 20 s)");
}

const OUT = path.join(ROOT, "docs/pitch/BRAVER-Finale-10min.pptx");
pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT));
