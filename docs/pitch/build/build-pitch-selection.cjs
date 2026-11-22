// Deck 1 — 3-minute selection pitch (Nexus HealthTech, 20 Nov 2026), French.
// Follows the team's spoken text paragraph by paragraph (the text is in each slide's notes):
// title → la famille du stress → le vrai problème → une « brave place » → concrètement → pas de réassurance
// → nous sommes petits (shan shui) → devenir BRAVER (team + QR).
// Usage: NODE_PATH=<dir with pptxgenjs>/node_modules node docs/pitch/build/build-pitch-selection.cjs
// then: python -I docs/pitch/build/add_motion.py docs/pitch/BRAVER-Selection-3min.pptx (Morph + entrance animations).
const path = require("node:path");
const pptxgen = require("pptxgenjs");
const { ROOT, A, C, F, pct, numbers, scene, addOrbs, accentRuns, card, eyebrow, logo, TEAM, EVENT, teamCards, partnerLogos } = require("./deck-lib.cjs");

const N = numbers();
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "BRAVER — pitch de sélection";
pres.author = "Équipe CTRL C";
const OFF = { scenario: [10.4, 1.0, 0.5], action: [10.6, 2.2, 0.4], acceptation: [10.5, 3.2, 0.3] }; // orbs leave the frame

// ── 1. Title (dawn): logos + team CTRL C ────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 0, orbs: { scenario: [7.45, 1.25, 1.05], action: [8.6, 1.7, 0.78], acceptation: [7.95, 2.25, 0.58] } });
  logo(s, 0.6, 0.45, "@0 logo");
  partnerLogos(pres, s, 5.15, 0.25, "@0 partners");
  s.addText(accentRuns(["Vide ta ", "tête", "."], { fontFace: F.light, fontSize: 60, color: C.ink }), { x: 0.55, y: 1.15, w: 6.2, h: 1.15, margin: 0, objectName: "@1 title" });
  s.addText("L'IA qui t'aide à affronter le stress, pas seulement à en parler.", { x: 0.6, y: 2.3, w: 5.8, h: 0.65, fontFace: F.body, fontSize: 16, color: C.ink, margin: 0, objectName: "@2 sub" });
  s.addText(EVENT, { x: 0.6, y: 3.0, w: 6.2, h: 0.3, fontFace: F.bold, fontSize: 11, color: C.ink2, margin: 0, objectName: "@3 date" });
  card(pres, s, 0.6, 3.6, 8.8, 1.7, "@4 teamcard", { transparency: 6 });
  s.addText("ÉQUIPE CTRL C", { x: 0.85, y: 3.72, w: 4, h: 0.28, fontFace: F.bold, fontSize: 10, color: C.ink2, charSpacing: 3, margin: 0, objectName: "@4 teamlabel" });
  TEAM.forEach((m, i) => {
    const x = 0.8 + i * 2.15;
    s.addShape(pres.shapes.OVAL, { x, y: 4.32, w: 0.16, h: 0.16, fill: { color: [C.scenario, C.action, C.acceptation, C.ink][i] }, line: { type: "none" }, objectName: `@${5 + i} dot` });
    s.addText([{ text: m.name, options: { fontFace: F.bold, fontSize: 11, color: C.ink, breakLine: true } }, { text: m.role, options: { fontFace: F.body, fontSize: 8.5, color: C.ink2 } }], { x: x + 0.26, y: 4.03, w: 1.85, h: 0.9, margin: 0, valign: "middle", objectName: `@${5 + i} name` });
  });
  s.addNotes("Bonjour à toutes et à tous. Merci aux membres du jury pour leur temps, et aux organisateurs de ce hackathon.");
}

// ── 2. La famille du stress ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 78, orbs: { scenario: [8.7, 0.35, 0.8], action: [9.15, 1.05, 0.55], acceptation: [8.5, 1.3, 0.42] } });
  eyebrow(s, "LA PROBLÉMATIQUE", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["La santé mentale, et toute la ", "famille", " du stress."], { fontFace: F.light, fontSize: 28, color: C.ink }), { x: 0.6, y: 0.85, w: 7.9, h: 0.7, margin: 0, objectName: "@1 title" });
  const widths = [1.15, 0.85, 1.15, 1.45, 1.65];
  ["Panique", "Peur", "Burn-out", "Overthinking", "Crises de nerfs"].forEach((w, i) => {
    const x = 0.6 + widths.slice(0, i).reduce((a, b) => a + b + 0.15, 0);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: widths[i], h: 0.45, rectRadius: 0.22, fill: { color: C.surface }, line: { color: C.line, width: 0.75 }, objectName: `@2 chip${i}` });
    s.addText(w, { x, y: 1.85, w: widths[i], h: 0.45, align: "center", valign: "middle", fontFace: F.bold, fontSize: 12, color: C.ink, margin: 0, objectName: `@2 chipt${i}` });
  });
  [["Effrayant.", C.scenario], ["Étouffant.", C.action], ["Épuisant.", C.acceptation]].forEach(([w, col], i) => {
    s.addText(w, { x: 0.6 + i * 2.75, y: 2.65, w: 2.7, h: 0.75, fontFace: F.light, fontSize: 34, color: col, margin: 0, objectName: `@${3 + i} word` });
  });
  card(pres, s, 0.6, 3.75, 8.8, 1.15, "@6 quotecard");
  s.addText("« Le rêve n'est plus une vie de luxe, juste une vie simple. »", { x: 0.9, y: 3.75, w: 8.2, h: 1.15, valign: "middle", fontFace: F.serif, italic: true, fontSize: 21, color: C.ink, margin: 0, objectName: "@6 quote" });
  s.addNotes(
    "Notre projet répond à une problématique réelle et très fréquente aujourd'hui : la santé mentale, et plus précisément tout ce qui touche à la famille du stress : la panique, la peur, le burn-out, l'overthinking, les crises de nerfs.\n\n" +
      "Ce ne sont pas de simples mots, mais un état d'esprit effrayant, étouffant et épuisant à la fois. Quand on l'a vécu, on connaît la gravité de la situation : cela bloque, cela paralyse, jusqu'à ne plus pouvoir vivre normalement. Le rêve n'est plus une vie de luxe, juste une vie simple.",
  );
}

// ── 3. Le vrai problème ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 84, orbs: { scenario: [9.0, 4.55, 0.5], action: [9.45, 4.95, 0.36], acceptation: [8.7, 5.05, 0.3] } });
  eyebrow(s, "LE VRAI PROBLÈME", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["Beaucoup de gens souffrent ", "en silence", "."], { fontFace: F.light, fontSize: 32, color: C.ink }), { x: 0.6, y: 0.8, w: 8.8, h: 0.75, margin: 0, objectName: "@1 title" });
  s.addText("Le manque de sensibilisation et la banalisation du sujet.", { x: 0.6, y: 1.55, w: 8.8, h: 0.4, fontFace: F.body, fontSize: 14, color: C.ink2, margin: 0, objectName: "@1 sub" });
  const items = [
    [C.scenario, "Personne à qui parler", "ou personne à qui faire confiance."],
    [C.action, "Pas les moyens", "de consulter un professionnel."],
    [C.danger, "Freiné par l'entourage", "et par sa mentalité."],
  ];
  items.forEach(([col, t, d], i) => {
    const x = 0.6 + i * 3.0;
    card(pres, s, x, 2.3, 2.75, 2.0, `@${2 + i} card`);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.6, w: 0.32, h: 0.32, fill: { color: col }, line: { type: "none" }, objectName: `@${2 + i} dot` });
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 17, color: C.ink, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 13, color: C.ink2 } }], { x: x + 0.3, y: 3.1, w: 2.25, h: 1.05, margin: 0, valign: "top", objectName: `@${2 + i} text` });
  });
  s.addNotes(
    "Le vrai problème, c'est le manque de sensibilisation et la banalisation du sujet. Beaucoup de gens souffrent en silence : soit ils ne trouvent personne à qui parler, ou ne font confiance à personne ; soit ils n'ont pas les moyens de consulter un professionnel ; soit ils sont freinés par la mentalité de leur entourage.",
  );
}

// ── 4. Une « brave place » ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 70, orbs: { scenario: [7.0, 1.45, 1.25], action: [8.35, 2.0, 0.95], acceptation: [7.55, 2.75, 0.7] } });
  eyebrow(s, "NOTRE RÉPONSE", 0.6, 0.45, "@0 eyebrow");
  s.addText("Pas une safe place.", { x: 0.6, y: 1.2, w: 6.2, h: 0.75, fontFace: F.light, fontSize: 34, color: C.ink2, strike: "sngStrike", margin: 0, objectName: "@1 safe" });
  s.addText(accentRuns(["Une ", "brave place", "."], { fontFace: F.light, fontSize: 50, color: C.ink }), { x: 0.6, y: 2.0, w: 6.5, h: 1.0, margin: 0, objectName: "@2 brave" });
  s.addText("Une IA qui ne sert pas seulement à raconter tes problèmes, tes pensées et tes peurs, mais à t'aider à les affronter.", { x: 0.6, y: 3.2, w: 5.8, h: 0.9, fontFace: F.body, fontSize: 15, color: C.ink, margin: 0, objectName: "@3 sub" });
  s.addNotes(
    "C'est pour cela que nous avons voulu créer une safe place pour ces personnes, mais avec un petit changement : une « brave place ». Notre IA ne sera pas seulement là pour que tu lui racontes tes problèmes, tes pensées et tes peurs, mais aussi pour t'aider à les affronter.",
  );
}

// ── 5. Concrètement ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 86 });
  eyebrow(s, "CONCRÈTEMENT", 0.6, 0.38, "@0 eyebrow");
  s.addText(accentRuns(["Tu écris ce qui te bloque. BRAVER ", "trie", "."], { fontFace: F.light, fontSize: 28, color: C.ink }), { x: 0.6, y: 0.68, w: 8.8, h: 0.65, margin: 0, objectName: "@1 title" });
  s.addText("Au lieu de te rassurer, BRAVER sépare ce qui dépend de toi de ce qui n'en dépend pas.", { x: 0.6, y: 1.32, w: 8.8, h: 0.35, fontFace: F.body, fontSize: 12.5, color: C.ink2, margin: 0, objectName: "@1 sub" });
  const zones = [
    ["Ça dépend de toi", "Action", C.action, "Tu l'affrontes : un petit défi à la fois, moins de 15 minutes, avec un minuteur."],
    ["Ça ne dépend pas de toi", "Acceptation", C.acceptation, "Tu l'acceptes et tu prends du recul, en gardant ce qui reste à toi."],
    ["Tu l'imagines", "Scénario", C.scenario, "Tu notes ta prédiction, puis tu vérifies ce qui s'est vraiment passé."],
  ];
  zones.forEach(([head, name, col, d], i) => {
    const x = 0.6 + i * 3.0;
    card(pres, s, x, 1.85, 2.75, 1.95, `@${2 + i} card`);
    s.addText(head, { x: x + 0.95, y: 2.02, w: 1.7, h: 0.5, fontFace: F.bold, fontSize: 12.5, color: C.ink, margin: 0, valign: "middle", objectName: `@${2 + i} head` });
    s.addText(name, { x: x + 0.3, y: 2.7, w: 2.2, h: 0.3, fontFace: F.bold, fontSize: 13, color: col, margin: 0, objectName: `@${2 + i} name` });
    s.addText(d, { x: x + 0.3, y: 3.02, w: 2.25, h: 0.75, fontFace: F.body, fontSize: 10.5, color: C.ink2, margin: 0, valign: "top", objectName: `@${2 + i} d` });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 3.98, w: 8.8, h: 1.25, rectRadius: 0.14, fill: { color: C.dangerSoft }, line: { color: "F2B8BB", width: 0.75 }, objectName: "@5 help" });
  s.addText([
    { text: "Si ça dépasse ce qu'une application peut faire : ", options: { fontFace: F.bold, color: C.danger } },
    { text: "BRAVER s'arrête et oriente vers un professionnel, avec les numéros marocains (19, 15, 2511…).", options: { fontFace: F.body, color: C.ink, breakLine: true } },
    { text: `Sur le téléphone, ${pct(N.safety.recall)} des messages en danger sont repérés (n = ${N.safety.dangerN}, phrases de test traduites ou générées par IA).`, options: { fontFace: F.body, color: C.ink2, fontSize: 10 } },
  ], { x: 0.85, y: 4.03, w: 8.35, h: 1.15, fontSize: 12, margin: 0, valign: "middle", objectName: "@5 helpt" });
  addOrbs(s, { action: [0.85, 2.05, 0.55], acceptation: [3.85, 2.05, 0.55], scenario: [6.85, 2.05, 0.55] });
  s.addNotes(
    "Concrètement, tu exprimes ce qui te bloque, à l'écrit ou à voix haute. Au lieu de te rassurer, BRAVER t'aide à faire le tri entre ce qui dépend de toi et ce qui n'en dépend pas. " +
      "Ce qui dépend de toi, tu l'affrontes grâce à des défis progressifs. Ce qui ne dépend pas de toi, BRAVER t'aide à l'accepter et à prendre du recul. " +
      "Et si la situation dépasse ce qu'une application peut faire, BRAVER t'oriente vers un professionnel.\n\n" +
      "[Attention : l'app accepte aujourd'hui l'écrit seulement (pas encore la voix), et l'action est un seul défi de moins de 15 minutes. Option : dire « à l'écrit » et « un petit défi à la fois ».]",
  );
}

// ── 6. Pas de réassurance ───────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dusk", veil: 80, orbs: { scenario: [9.0, 0.35, 0.5], action: [9.4, 0.95, 0.36], acceptation: [8.75, 1.0, 0.28] } });
  eyebrow(s, "CE QUI NOUS DISTINGUE", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["Nous ne vendons pas de la ", "réassurance", "."], { fontFace: F.light, fontSize: 32, color: C.ink }), { x: 0.6, y: 0.8, w: 8.2, h: 0.8, margin: 0, objectName: "@1 title" });
  ["« Ne stresse pas. »", "« Tout va bien. »", "« N'aie pas peur. »"].forEach((q, i) => {
    s.addText(q, { x: 0.6 + i * 2.95, y: 1.9, w: 2.85, h: 0.7, fontFace: F.serif, italic: true, fontSize: 22, color: C.ink2, strike: "sngStrike", margin: 0, objectName: `@${2 + i} q` });
  });
  s.addText([
    { text: "Ça ne se contrôle pas : ", options: { fontFace: F.bold, color: C.ink } },
    { text: "un déclencheur suffit, et tout revient. Il faut penser autrement.", options: { fontFace: F.body, color: C.ink } },
  ], { x: 0.6, y: 2.95, w: 8.8, h: 0.45, fontSize: 15, margin: 0, objectName: "@5 point" });
  card(pres, s, 0.6, 3.7, 8.8, 1.1, "@6 card");
  s.addText([
    { text: "Dans BRAVER, c'est dans le code : ", options: { fontFace: F.bold, color: C.ink, breakLine: true } },
    { text: "les phrases rassurantes (« tout va bien », « ne t'inquiète pas », « ça va aller », « ma tkhafch »…) sont filtrées avant d'arriver à l'écran.", options: { fontFace: F.body, color: C.ink2 } },
  ], { x: 0.85, y: 3.75, w: 8.35, h: 1.0, fontSize: 12, margin: 0, valign: "middle", objectName: "@6 t" });
  s.addNotes(
    "C'est ce qui nous distingue des autres IA : nous ne vendons pas de la réassurance, parce que, nous l'avons constaté, elle ne fonctionne plus. On entend tout le temps : « ne stresse pas », « tout va bien », « n'aie pas peur »… " +
      "Mais on oublie que cela ne se contrôle pas : il suffit d'un événement déclencheur pour repartir de zéro, et tout revient : le stress, les pensées sombres, la terreur. Il faut arrêter ces réponses classiques qui ne mènent nulle part, et penser autrement.",
  );
}

// ── 7. Nous sommes petits (shan shui) ───────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addImage({ path: A("shanshui.jpg"), x: 0, y: 0, w: 10, h: 5.625, objectName: "!!sky" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.paper, transparency: 100 }, line: { type: "none" }, objectName: "!!veil" });
  addOrbs(s, OFF);
  s.addText(accentRuns(["Nous sommes ", "petits", "\ndans ce monde."], { fontFace: F.light, fontSize: 38, color: C.ink }), { x: 0.6, y: 0.55, w: 5.2, h: 1.6, margin: 0, objectName: "@1 title" });
  s.addText("Montagnes, arbres et cascades immenses, et en bas, l'humain : un tout petit point.", { x: 0.6, y: 2.2, w: 4.4, h: 0.8, fontFace: F.body, fontSize: 13, color: C.ink, margin: 0, objectName: "@2 sub" });
  s.addText("Image générée par IA, dans l'esprit de la peinture chinoise de paysage (shan shui).", { x: 0.6, y: 3.05, w: 4.4, h: 0.45, fontFace: F.body, fontSize: 8.5, color: C.ink2, margin: 0, objectName: "@3 credit" });
  s.addNotes(
    "Savez-vous qu'autrefois, certains Chinois qui souffraient du stress et d'une pression immense se tournaient vers l'art ? Ils peignaient des montagnes, des arbres et des cascades immenses, et en bas, l'humain, réduit à un tout petit point. " +
      "L'idée, c'était de prendre conscience de combien nous sommes petits dans ce monde, et cela les apaisait.",
  );
}

// ── 8. Devenir BRAVER (night): team + QR ────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "night", veil: 0, orbs: { scenario: [6.85, 0.3, 0.62], action: [7.6, 0.6, 0.46], acceptation: [7.15, 1.05, 0.36] } });
  eyebrow(s, "NOTRE IDÉE", 0.6, 0.45, "@0 eyebrow", "C9C3EE");
  s.addText([
    { text: "Devenir plus braves…", options: { fontFace: F.light, fontSize: 30, color: C.moon, breakLine: true } },
    { text: "devenir ", options: { fontFace: F.light, fontSize: 30, color: C.moon } },
    { text: "BRAVER", options: { fontFace: F.serif, italic: true, fontSize: 30, color: C.moon } },
    { text: ".", options: { fontFace: F.light, fontSize: 30, color: C.moon } },
  ], { x: 0.6, y: 0.8, w: 6.2, h: 1.15, margin: 0, objectName: "@1 title" });
  teamCards(pres, s);
  card(pres, s, 6.95, 2.0, 2.45, 2.85, "@6 qrcard", { fill: C.surface, transparency: 0 });
  s.addImage({ path: A("qr.png"), x: 7.3, y: 2.2, w: 1.75, h: 1.75, objectName: "@6 qr" });
  s.addText([{ text: "Essayez-la maintenant", options: { fontFace: F.bold, fontSize: 11, color: C.ink, breakLine: true } }, { text: "braver-omega.vercel.app", options: { fontFace: F.body, fontSize: 10, color: C.scenario, hyperlink: { url: "https://braver-omega.vercel.app" } } }], { x: 7.05, y: 4.05, w: 2.25, h: 0.6, align: "center", margin: 0, objectName: "@6 url" });
  s.addText("BRAVER n'est pas un service médical et ne pose pas de diagnostic.", { x: 0.6, y: 4.95, w: 6, h: 0.3, fontFace: F.body, fontSize: 9, color: "C9C3EE", margin: 0, objectName: "@7 disc" });
  s.addNotes(
    "Et c'est exactement l'idée de notre projet : aider les gens à affronter leurs problèmes, leurs pensées et leurs peurs, non pas en les rassurant, mais en les aidant à devenir plus braves… à devenir BRAVER.\n\n[Pause. Montrer le QR code : l'app est en ligne.] Merci.",
  );
}

const OUT = path.join(ROOT, "docs/pitch/BRAVER-Selection-3min.pptx");
pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT));
