// Deck 1 — 3-minute selection pitch (22 Nov 2026), French. Problem → solution → safety → impact → app → team.
// Usage: NODE_PATH=<dir with pptxgenjs>/node_modules node docs/pitch/build/build-pitch-selection.cjs
// then: python docs/pitch/build/add_motion.py docs/pitch/BRAVER-Selection-3min.pptx (Morph + entrance animations).
const path = require("node:path");
const pptxgen = require("pptxgenjs");
const { ROOT, A, C, F, pct, numbers, scene, addOrbs, accentRuns, card, eyebrow, logo } = require("./deck-lib.cjs");

const N = numbers();
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "BRAVER — pitch de sélection";
pres.author = "Équipe BRAVER";

const TEAM = [
  ["El Asmi Ilyas Daoud", "Machine learning · développement"],
  ["El Mouhib Ayoub", "Machine learning · développement"],
  ["El Wali Soukayna", "Machine learning · développement"],
  ["Mfarram Mossaab", "Machine learning · développement"],
];

// ── 1. Title (dawn, no veil) ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 0, orbs: { scenario: [6.7, 1.1, 1.5], action: [8.2, 1.9, 1.15], acceptation: [7.2, 2.6, 0.85] } });
  logo(s, 0.6, 0.45, "@0 logo");
  s.addText(accentRuns(["Vide ta ", "tête", "."], { fontFace: F.light, fontSize: 66, color: C.ink }), { x: 0.55, y: 1.15, w: 6.2, h: 1.3, margin: 0, objectName: "@1 title" });
  s.addText("L'app qui aide les jeunes à trier leurs inquiétudes, avec la sécurité d'abord.", { x: 0.6, y: 2.5, w: 5.4, h: 0.8, fontFace: F.body, fontSize: 17, color: C.ink, margin: 0, objectName: "@2 sub" });
  s.addText("Hackathon · Oujda · 22 novembre 2026", { x: 0.6, y: 3.35, w: 5, h: 0.3, fontFace: F.bold, fontSize: 11, color: C.ink2, margin: 0, objectName: "@3 date" });
  s.addNotes(
    "Bonjour. Nous sommes l'équipe BRAVER. [pause] Quand une inquiétude tourne en boucle dans la tête, la nuit, souvent on est seul avec elle. " +
      "BRAVER aide les jeunes à la poser, à la trier, et à faire un petit pas, avec une règle : la sécurité d'abord. (≈ 15 s)",
  );
}

// ── 2. Problème (dawn, light veil) ──────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 72, orbs: { scenario: [8.6, 0.35, 0.9], action: [9.0, 1.2, 0.6], acceptation: [8.45, 1.55, 0.45] } });
  eyebrow(s, "LE PROBLÈME", 0.6, 0.5, "@0 eyebrow");
  s.addText(accentRuns(["Une inquiétude qui tourne en boucle, ", "seul", ", la nuit."], { fontFace: F.light, fontSize: 34, color: C.ink }), { x: 0.6, y: 0.85, w: 7.6, h: 1.25, margin: 0, objectName: "@1 title" });
  const items = [
    [C.scenario, "Les pensées anxieuses tournent en rond", "On mélange ce qui est une prédiction, un vrai problème, ou ce qu'on ne contrôle pas."],
    [C.action, "L'aide n'est pas toujours là", "Un professionnel coûte, il faut attendre, et on n'ose pas toujours en parler."],
    [C.danger, "Les signaux de danger passent inaperçus", "Les apps existantes parlent rarement darija et ne repèrent pas un message en danger."],
  ];
  items.forEach(([col, t, d], i) => {
    const y = 2.35 + i * 1.0;
    card(pres, s, 0.6, y, 8.0, 0.85, `@${2 + i} card`);
    s.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.3, w: 0.24, h: 0.24, fill: { color: col }, line: { type: "none" }, objectName: `@${2 + i} dot` });
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 14, color: C.ink, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 11.5, color: C.ink2 } }], { x: 1.3, y: y + 0.08, w: 7.1, h: 0.7, margin: 0, valign: "middle", objectName: `@${2 + i} text` });
  });
  s.addNotes(
    "Le problème. Quand on est jeune et qu'on s'inquiète, tout se mélange : ce qu'on imagine, ce qu'on peut régler, et ce qui ne dépend pas de nous. " +
      "L'aide d'un professionnel n'est pas toujours accessible. Et les applications existantes parlent rarement darija, et ne savent pas reconnaître un message de danger. (≈ 25 s)",
  );
}

// ── 3. Solution : trois zones (orbs morph into the three cards) ─────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 82 });
  eyebrow(s, "LA SOLUTION", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["Tu écris. BRAVER ", "trie", " en trois zones."], { fontFace: F.light, fontSize: 34, color: C.ink }), { x: 0.6, y: 0.8, w: 8.8, h: 0.75, margin: 0, objectName: "@1 title" });
  s.addText("Une IA lit chaque inquiétude, en français ou en darija, puis propose une seule chose à faire.", { x: 0.6, y: 1.55, w: 8.8, h: 0.4, fontFace: F.body, fontSize: 13, color: C.ink2, margin: 0, objectName: "@1 sub" });
  const zones = [
    ["Scénario", C.scenario, "« Je vais rater mon exam. »", "Tu notes ta prédiction, puis tu compares avec ce qui s'est passé."],
    ["Action", C.action, "« Je n'ai pas commencé mon rapport. »", "Un seul pas de moins de 15 minutes, avec un minuteur."],
    ["Acceptation", C.acceptation, "« Mon père est malade. »", "Tu le reconnais, et tu gardes une chose qui dépend de toi."],
  ];
  zones.forEach(([name, col, ex, then], i) => {
    const x = 0.6 + i * 3.0;
    card(pres, s, x, 2.25, 2.75, 2.85, `@${2 + i} card`);
    s.addText(name, { x: x + 1.05, y: 2.62, w: 1.6, h: 0.35, fontFace: F.bold, fontSize: 16, color: col, margin: 0, objectName: `@${2 + i} name` });
    s.addText(ex, { x: x + 0.3, y: 3.35, w: 2.25, h: 0.6, fontFace: F.serif, italic: true, fontSize: 11.5, valign: "top", color: C.ink, margin: 0, objectName: `@${2 + i} ex` });
    s.addText(then, { x: x + 0.3, y: 4.05, w: 2.2, h: 0.9, fontFace: F.body, fontSize: 11, color: C.ink2, margin: 0, valign: "top", objectName: `@${2 + i} then` });
  });
  addOrbs(s, { scenario: [0.85, 2.5, 0.6], action: [3.85, 2.5, 0.6], acceptation: [6.85, 2.5, 0.6] });
  s.addNotes(
    "Notre solution : tu écris ce qui t'inquiète, et BRAVER le range dans une des trois zones. " +
      "Un scénario, c'est une prédiction : tu la notes, et plus tard tu compares avec la réalité. " +
      "Une action, c'est un vrai problème : on te propose un seul pas de moins de 15 minutes. " +
      "L'acceptation, c'est ce qui ne dépend pas de toi : tu le reconnais, et tu gardes ce qui reste dans ton contrôle. (≈ 30 s)",
  );
}

// ── 4. Sécurité d'abord ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dawn", veil: 82, orbs: { scenario: [5.75, 4.75, 0.5], action: [6.3, 4.95, 0.38], acceptation: [5.45, 5.05, 0.3] } });
  eyebrow(s, "LA SÉCURITÉ D'ABORD", 0.6, 0.45, "@0 eyebrow", C.danger);
  s.addText(accentRuns(["Si ça va ", "vraiment", " mal, on s'arrête."], { fontFace: F.light, fontSize: 34, color: C.ink }), { x: 0.6, y: 0.8, w: 6.2, h: 1.2, margin: 0, objectName: "@1 title" });
  const steps = [
    ["1", "Sur le téléphone, avant tout envoi", "Mots-clés + un modèle entraîné, même sans réseau."],
    ["2", "L'IA en ligne ne tranche que le doute", "Et si le score reste haut, l'alerte est gardée."],
    ["3", "Écran d'aide immédiat", "Numéros marocains (19, 15, 2511…) et message prêt pour un proche."],
  ];
  steps.forEach(([n, t, d], i) => {
    const y = 2.15 + i * 0.85;
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.05, w: 0.42, h: 0.42, fill: { color: i === 2 ? C.danger : C.ink }, line: { type: "none" }, objectName: `@${2 + i} n` });
    s.addText(n, { x: 0.6, y: y + 0.05, w: 0.42, h: 0.42, align: "center", valign: "middle", fontFace: F.bold, fontSize: 13, color: C.surface, margin: 0, objectName: `@${2 + i} nt` });
    s.addText([{ text: t, options: { fontFace: F.bold, fontSize: 14, color: C.ink, breakLine: true } }, { text: d, options: { fontFace: F.body, fontSize: 11.5, color: C.ink2 } }], { x: 1.2, y, w: 4.9, h: 0.7, margin: 0, valign: "top", objectName: `@${2 + i} t` });
  });
  card(pres, s, 6.35, 1.0, 3.05, 3.6, "@5 statcard");
  s.addText(pct(N.safety.recall), { x: 6.55, y: 1.35, w: 2.7, h: 0.8, fontFace: F.light, fontSize: 40, color: C.danger, margin: 0, objectName: "@5 stat" });
  s.addText("des messages en danger repérés sur le téléphone, sans réseau", { x: 6.55, y: 2.15, w: 2.7, h: 0.75, fontFace: F.body, fontSize: 12, color: C.ink, margin: 0, objectName: "@5 statl" });
  s.addText(`n = ${N.safety.dangerN} messages en danger, jamais vus à l'entraînement`, { x: 6.55, y: 2.95, w: 2.7, h: 0.5, fontFace: F.body, fontSize: 9.5, color: C.ink2, margin: 0, objectName: "@5 statn" });
  s.addText(`En ligne : ${N.safety.onlineCaught} sur ${N.safety.onlineDanger} repérés (échantillon, n = ${N.safety.onlineN})`, { x: 6.55, y: 3.6, w: 2.7, h: 0.6, fontFace: F.bold, fontSize: 11, color: C.ink, margin: 0, objectName: "@6 online" });
  s.addNotes(
    "Notre priorité, c'est la sécurité. Avant que le message parte sur internet, le téléphone le vérifie avec des mots-clés et un modèle que nous avons entraîné. " +
      `Il repère ${pct(N.safety.recall)} des messages en danger, sur des phrases jamais vues. ` +
      "L'IA en ligne ne décide que les cas douteux, et si le doute reste fort, on garde l'alerte. Alors l'app s'arrête et montre les numéros marocains et un message prêt à envoyer à un proche. (≈ 30 s)",
  );
}

// ── 5. Impact (dusk) ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dusk", veil: 80, orbs: { scenario: [8.95, 4.3, 0.5], action: [9.1, 0.3, 0.5], acceptation: [9.4, 4.85, 0.35] } });
  eyebrow(s, "L'IMPACT", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["Mesuré, ", "pas", " promis."], { fontFace: F.light, fontSize: 34, color: C.ink }), { x: 0.6, y: 0.8, w: 8.8, h: 0.75, margin: 0, objectName: "@1 title" });
  const stats = [
    [pct(N.safety.recall), "danger repéré sur le téléphone", `n = ${N.safety.dangerN}`],
    [`${N.safety.onlineCaught} / ${N.safety.onlineDanger}`, "danger repéré avec l'app en ligne", `échantillon n = ${N.safety.onlineN}`],
    [pct(N.zones.dev.accuracy), "bonne zone par le modèle du téléphone", `n = ${N.zones.dev.n}`],
    [`${N.hc.qwen.agree} / ${N.hc.qwen.n}`, "étiquettes de zone confirmées par une personne", "étiquettes IA visibles"],
  ];
  stats.forEach(([big, lab, n], i) => {
    const x = 0.6 + i * 2.22;
    card(pres, s, x, 1.75, 2.05, 1.9, `@${2 + i} card`);
    s.addText(big, { x: x + 0.18, y: 1.92, w: 1.8, h: 0.62, fontFace: F.light, fontSize: 27, color: C.ink, margin: 0, objectName: `@${2 + i} big` });
    s.addText(lab, { x: x + 0.18, y: 2.6, w: 1.75, h: 0.6, fontFace: F.body, fontSize: 10.5, color: C.ink, margin: 0, objectName: `@${2 + i} lab` });
    s.addText(n, { x: x + 0.18, y: 3.25, w: 1.75, h: 0.3, fontFace: F.body, fontSize: 9, color: C.ink2, margin: 0, objectName: `@${2 + i} n` });
  });
  s.addText([
    { text: "Pour les jeunes : ", options: { fontFace: F.bold, color: C.ink } },
    { text: "gratuit · sans compte · données sur le téléphone · français et darija · marche même sans réseau.", options: { fontFace: F.body, color: C.ink } },
  ], { x: 0.6, y: 3.95, w: 8.8, h: 0.4, fontSize: 12, margin: 0, objectName: "@6 impact" });
  s.addText("Phrases de test traduites ou générées par une IA, jamais vues à l'entraînement. Chiffres tronqués, détail sur la page Labo.", { x: 0.6, y: 4.5, w: 8.8, h: 0.35, fontFace: F.body, fontSize: 9.5, color: C.ink2, margin: 0, objectName: "@7 caveat" });
  s.addNotes(
    "L'impact, et nos preuves. Tous ces chiffres sont mesurés sur des phrases que le modèle n'a jamais vues. " +
      `Sécurité : ${pct(N.safety.recall)} sur le téléphone, ${N.safety.onlineCaught} sur ${N.safety.onlineDanger} en ligne. Zones : ${pct(N.zones.dev.accuracy)}. ` +
      "Et pour les jeunes : c'est gratuit, sans compte, en français et en darija, et leurs données restent sur leur téléphone. (≈ 25 s)",
  );
}

// ── 6. L'app (dusk) ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "dusk", veil: 55, orbs: { scenario: [8.95, 0.45, 0.6], action: [9.3, 2.1, 0.42], acceptation: [9.2, 1.2, 0.35] } });
  eyebrow(s, "LE PRODUIT", 0.6, 0.45, "@0 eyebrow");
  s.addText(accentRuns(["Déjà ", "en ligne", ", sur téléphone et PC."], { fontFace: F.light, fontSize: 32, color: C.ink }), { x: 0.6, y: 0.78, w: 8.8, h: 0.7, margin: 0, objectName: "@1 title" });
  const phones = [["landing", "Accueil du site"], ["accueil", "Humeur + vider sa tête"], ["securite", "Écran d'aide"]];
  phones.forEach(([f, label], i) => {
    const x = 1.15 + i * 2.75;
    s.addImage({ path: A(`phone-${f}.png`), x, y: 1.6, w: 1.75, h: 3.27, objectName: `@${2 + i} phone` });
    s.addText(label, { x: x - 0.3, y: 4.95, w: 2.35, h: 0.3, align: "center", fontFace: F.bold, fontSize: 11, color: C.ink, margin: 0, objectName: `@${2 + i} lab` });
  });
  s.addNotes(
    "Et ce n'est pas une maquette : l'application est en ligne, sur téléphone et sur PC. " +
      "Écran d'accueil, humeur du jour, tri des inquiétudes, suivi, respiration, et l'écran d'aide avec les numéros marocains. (≈ 15 s)",
  );
}

// ── 7. Équipe + lien + QR (night) ───────────────────────────────────────────
{
  const s = pres.addSlide();
  scene(pres, s, { sky: "night", veil: 0, orbs: { scenario: [6.85, 0.3, 0.62], action: [7.6, 0.6, 0.46], acceptation: [7.15, 1.05, 0.36] } });
  eyebrow(s, "L'ÉQUIPE", 0.6, 0.45, "@0 eyebrow", "C9C3EE");
  s.addText(accentRuns(["Choisissez BRAVER pour la ", "finale", "."], { fontFace: F.light, fontSize: 34, color: C.moon }), { x: 0.6, y: 0.8, w: 6.6, h: 1.2, margin: 0, objectName: "@1 title" });
  TEAM.forEach(([name, role], i) => {
    const x = 0.6 + (i % 2) * 3.15, y = 2.15 + Math.floor(i / 2) * 0.95;
    card(pres, s, x, y, 2.95, 0.8, `@${2 + i} card`, { dark: true });
    s.addText([{ text: name, options: { fontFace: F.bold, fontSize: 13, color: C.moon, breakLine: true } }, { text: role, options: { fontFace: F.body, fontSize: 10, color: "C9C3EE" } }], { x: x + 0.2, y: y + 0.1, w: 2.6, h: 0.6, margin: 0, valign: "middle", objectName: `@${2 + i} t` });
  });
  card(pres, s, 6.95, 2.0, 2.45, 2.85, "@6 qrcard", { fill: C.surface, transparency: 0 });
  s.addImage({ path: A("qr.png"), x: 7.3, y: 2.2, w: 1.75, h: 1.75, objectName: "@6 qr" });
  s.addText([{ text: "Essayez-la maintenant", options: { fontFace: F.bold, fontSize: 11, color: C.ink, breakLine: true } }, { text: "braver-omega.vercel.app", options: { fontFace: F.body, fontSize: 10, color: C.scenario, hyperlink: { url: "https://braver-omega.vercel.app" } } }], { x: 7.05, y: 4.05, w: 2.25, h: 0.6, align: "center", margin: 0, objectName: "@6 url" });
  s.addText("BRAVER n'est pas un service médical et ne pose pas de diagnostic.", { x: 0.6, y: 4.95, w: 6, h: 0.3, fontFace: F.body, fontSize: 9, color: "C9C3EE", margin: 0, objectName: "@7 disc" });
  s.addNotes(
    "Nous sommes quatre : Ilyas, Ayoub, Soukayna et Mossaab, et nous avons construit ensemble le modèle, les données et l'application. " +
      "Scannez le QR code, l'app est en ligne maintenant. Sélectionnez BRAVER pour la finale : demain, on vous montre tout en détail. Merci. (≈ 20 s)",
  );
}

const OUT = path.join(ROOT, "docs/pitch/BRAVER-Selection-3min.pptx");
pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT));
