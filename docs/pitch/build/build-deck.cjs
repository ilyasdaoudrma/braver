// Builds docs/pitch/BRAVER-Pitch-2026-11-21.pptx from MEASURED files only:
//   public/labo/metrics.json (E1, written by ml/eval/report.py), ml/zones/results/agreement.json,
//   docs/measurements/sort-latency-*.json (I1), charts in ml/eval/results/<date>/*.png, screenshots in docs/pitch/build/shots/.
// Every measured figure is read from those files (truncated, never rounded up). Typed exceptions: the demo story
// ("1 fois sur 7", "60–90 %": lib/demo.ts, fictional, labelled), the parity bound (10⁻⁶, tested in CI).
// Usage (pptxgenjs installed outside the app): NODE_PATH=<dir with node_modules> node docs/pitch/build/build-deck.cjs
const fs = require("node:fs");
const path = require("node:path");
const pptxgen = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf-8"));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const M = read("public/labo/metrics.json");
const AG = exists("ml/zones/results/agreement.json") ? read("ml/zones/results/agreement.json") : null;
const HC = exists("ml/zones/results/human_check.json") ? read("ml/zones/results/human_check.json") : null;
const latFile = fs.readdirSync(path.join(ROOT, "docs/measurements")).filter((f) => f.startsWith("sort-latency")).sort().pop();
const LAT = latFile ? read(`docs/measurements/${latFile}`) : null;
const CHARTS = `ml/eval/results/${M.date}`;
const OUT = path.join(ROOT, "docs/pitch/BRAVER-Pitch-2026-11-21.pptx");

// Never round up: truncate.
const pct = (x) => `${(Math.floor(x * 1000 + 1e-9) / 10).toFixed(1).replace(".", ",")} %`;
const dec = (x, d = 2) => (Math.floor(x * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

const C = { ink: "131B2C", ink2: "4A5468", paper: "EDF0F4", surface: "F7F8FA", line: "C9D0DA", scen: "5B3FD6", act: "B93D0A", acc: "0B7065", focus: "2D6CDF", danger: "C0392B" };
const TITLE = "Georgia";
const BODY = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Ilyas Daoud & Ayoub — BRAVER";
pres.title = "BRAVER — trier ce qui t'inquiète";

function base(dark = false) {
  const s = pres.addSlide();
  s.background = { color: dark ? C.ink : C.paper };
  return s;
}
function title(s, text, dark = false) {
  s.addText(text, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: TITLE, fontSize: 28, bold: true, color: dark ? C.paper : C.ink, margin: 0, fit: "shrink" });
}
function foot(s, text, dark = false) {
  s.addText(text, { x: 0.5, y: 4.95, w: 9, h: 0.3, fontFace: BODY, fontSize: 9, color: dark ? "C9D0DA" : C.ink2, margin: 0 });
}
function card(s, x, y, w, h, color, head, body) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.surface }, line: { color: C.line, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.09, h, fill: { color }, line: { color, width: 0 } });
  s.addText(head, { x: x + 0.25, y: y + 0.15, w: w - 0.4, h: 0.4, fontFace: TITLE, fontSize: 16, bold: true, color, margin: 0 });
  s.addText(body, { x: x + 0.25, y: y + 0.6, w: w - 0.4, h: h - 0.75, fontFace: BODY, fontSize: 12, color: C.ink, valign: "top", margin: 0 });
}
function stat(s, x, y, w, value, label, color) {
  s.addText(value, { x, y, w, h: 0.8, fontFace: TITLE, fontSize: 40, bold: true, color, margin: 0 });
  s.addText(label, { x, y: y + 0.8, w, h: 0.6, fontFace: BODY, fontSize: 11, color: C.ink2, valign: "top", margin: 0 });
}

// 1 — Title
{
  const s = base(true);
  s.addText("BRAVER", { x: 0.5, y: 1.4, w: 9, h: 1.1, fontFace: TITLE, fontSize: 64, bold: true, color: C.paper, margin: 0 });
  s.addText("Vide ta tête. Trie ce qui t'inquiète. Vérifie ce que ton esprit prédit.", { x: 0.5, y: 2.6, w: 6.3, h: 0.9, fontFace: BODY, fontSize: 20, color: "D7DCE5", margin: 0 });
  [C.scen, C.act, C.acc].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: 0.5 + i * 0.45, y: 3.5, w: 0.3, h: 0.3, fill: { color: c }, line: { color: c, width: 0 } }));
  if (exists("docs/pitch/build/shots/vider.png")) s.addImage({ path: path.join(ROOT, "docs/pitch/build/shots/vider.png"), x: 7.2, y: 0.55, w: 2.2, h: 3.96 });
  foot(s, "Hackathon Oujda · 22 novembre 2026 · prévention santé mentale des jeunes au Maroc", true);
}

// 2 — The idea: three zones
{
  const s = base();
  title(s, "Chaque inquiétude va dans une zone");
  card(s, 0.5, 1.3, 2.8, 3.2, C.scen, "Scénario", "Une prédiction ou une interprétation.\n\n« Kolchi ghadi yd7ek 3liya f l'exposé »\n\n→ note ta prédiction et ta certitude, vérifie plus tard dans le Replay.");
  card(s, 3.6, 1.3, 2.8, 3.2, C.act, "Action", "Un vrai problème, une prise possible.\n\n« Mazal ma siftsh dossier dyal la bourse. »\n\n→ une étape de moins de 15 minutes, minuteur de 10 minutes.");
  card(s, 6.7, 1.3, 2.8, 3.2, C.acc, "Acceptation", "Réel et hors de contrôle.\n\n« Bba khrjouh mn lkhedma. »\n\n→ reconnaître, puis une chose qui reste à toi. Respirer.");
  foot(s, "Français, darija en lettres latines ou arabes. Pas de diagnostic, pas de « tout ira bien ».");
}

// 3 — Safety first
{
  const s = base();
  title(s, "La sécurité d'abord, sur le téléphone");
  const steps = [
    ["1", "Mots-clés", "« bghit nmout », « kayderbni » → écran d'aide", C.danger],
    ["2", "Modèle sur le téléphone", "score ≥ seuil haut → aide, sans réseau", C.focus],
    ["3", "IA (gpt-oss-20b)", "zone ambiguë : l'IA décide ; sans réseau → aide", C.scen],
    ["4", "Écran d'aide", "19 · 112 · 15 · 177 · 2511 · 8350, message prêt", C.acc],
  ];
  steps.forEach(([n, h, b, c], i) => {
    const y = 1.25 + i * 0.95;
    s.addShape(pres.shapes.OVAL, { x: 0.5, y, w: 0.6, h: 0.6, fill: { color: c }, line: { color: c, width: 0 } });
    s.addText(n, { x: 0.5, y, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: TITLE, fontSize: 18, bold: true, color: "F7F8FA", margin: 0 });
    s.addText(h, { x: 1.3, y: y - 0.02, w: 3.6, h: 0.35, fontFace: TITLE, fontSize: 15, bold: true, color: C.ink, margin: 0 });
    s.addText(b, { x: 1.3, y: y + 0.32, w: 3.8, h: 0.35, fontFace: BODY, fontSize: 11, color: C.ink2, margin: 0 });
  });
  s.addText("« Ce partiel va me tuer » : pas d'alerte.\n\n« ma bqitch baghi nfi9 sbah » : alerte.", { x: 5.0, y: 1.4, w: 2.2, h: 2.2, fontFace: TITLE, fontSize: 14, italic: true, color: C.ink, valign: "top", margin: 0 });
  if (exists("docs/pitch/build/shots/securite.png")) s.addImage({ path: path.join(ROOT, "docs/pitch/build/shots/securite.png"), x: 7.5, y: 1.15, w: 2.0, h: 3.6 });
  foot(s, "Seuils choisis sur la validation uniquement. Le test n'a jamais servi à régler quoi que ce soit.");
}

// 4 — Safety numbers (E1)
{
  const s = base();
  title(s, "Sécurité : des phrases jamais vues");
  const t = M.sets.safety_test;
  const pipe = t?.safety_pipeline?.all;
  const dev = t?.safety_device?.all;
  if (pipe) stat(s, 0.5, 1.3, 3.6, pct(pipe.danger.recall), `des messages en danger détectés, app en ligne\néchantillon : ${pipe.confusion[1][0] + pipe.confusion[1][1]} en danger sur n = ${pipe.n}`, C.acc);
  if (dev) stat(s, 0.5, 2.9, 3.6, pct(dev.danger.recall), `détectés sur le téléphone, sans réseau\n${dev.confusion[1][0] + dev.confusion[1][1]} en danger sur n = ${dev.n} · fausses alertes ${dev.confusion[0][1]} sur ${dev.confusion[0][0] + dev.confusion[0][1]}`, C.focus);
  const img = `${CHARTS}/safety_pipeline_confusion.png`;
  if (exists(img)) s.addImage({ path: path.join(ROOT, img), x: 4.4, y: 1.15, w: 4.4, h: 3.77 });
  foot(s, "Test : données publiques (Reddit, NVIDIA Aegis) + traductions FR/darija et phrases synthétiques générées par IA. Détail par langue : page Labo.");
}

// 5 — Zones numbers
{
  const s = base();
  title(s, "Le tri des zones");
  const z = M.sets.zones_test;
  const pipe = z?.zones_pipeline?.all;
  const dev = z?.zones_device?.all;
  if (dev) stat(s, 0.5, 1.3, 3.6, pct(dev.accuracy), `bonne zone sur le téléphone (modèle entraîné)\nmacro-F1 ${dec(dev.macro_f1)} · n = ${dev.n}`, C.focus);
  if (pipe) stat(s, 0.5, 2.9, 3.6, pct(pipe.accuracy), `bonne zone par l'IA en ligne (gpt-oss-20b)\nmacro-F1 ${dec(pipe.macro_f1)} · sous-échantillon n = ${pipe.n}`, C.scen);
  const img = `${CHARTS}/zones_device_confusion.png`;
  if (exists(img)) s.addImage({ path: path.join(ROOT, img), x: 4.4, y: 1.15, w: 4.4, h: 3.77 });
  const ag = AG ? `Étiquettes de tout le jeu (${AG.n_groups} inquiétudes) par deux IA : accord ${pct(AG.agreement_qwen_safeguard)}, kappa ${dec(AG.cohen_kappa_qwen_safeguard)}. Phrases synthétiques.` : "";
  const hq = HC?.qwen;
  const hc = hq ? ` Vérifié par une personne sur ${hq.n} au hasard (étiquettes IA visibles) : ${hq.agree} sur ${hq.n} d'accord, kappa ${dec(hq.kappa)}${HC.disagreements_in_test === 0 ? ", aucun désaccord dans le test" : ""}.` : " Aucune vérification humaine pour l'instant.";
  foot(s, ag + hc);
}

// 6 — Darija synthetic set (small n: counts, not percentages)
{
  const s = base();
  title(s, "Darija : le test le plus dur");
  const d = M.sets.darija_synthetic;
  const h = M.sets.darija_handwritten;
  const caught = (m) => `${m.confusion[1][1]} sur ${m.confusion[1][0] + m.confusion[1][1]}`;
  const dev = d?.safety_device?.all;
  const pipe = d?.safety_pipeline?.all;
  const zd = d?.zones_device?.all;
  if (dev) stat(s, 0.5, 1.3, 2.9, caught(dev), `phrases en danger détectées\nsur le téléphone (n = ${dev.n} au total)`, C.acc);
  if (pipe) stat(s, 3.6, 1.3, 2.9, caught(pipe), `détectées avec l'IA en ligne\n(échantillon, n = ${pipe.n})`, C.danger);
  if (zd) stat(s, 6.7, 1.3, 2.8, `${zd.confusion.reduce((a, r, i) => a + r[i], 0)} sur ${zd.n}`, "bonnes zones sur le téléphone", C.scen);
  s.addText(
    "En darija, l'IA en ligne effaçait parfois une alerte que le téléphone jugeait ambiguë : depuis le 20 nov., un score assez haut garde l'alerte (seuil choisi sur la validation, où 60 % de ces alertes gardées étaient justes).",
    { x: 0.5, y: 3.1, w: 9, h: 0.6, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0 },
  );
  const c = M.sets.darija_claude;
  if (c?.safety_device && c?.safety_pipeline) {
    s.addText(
      `Phrases darija écrites directement par Claude (une IA, sans autre modèle) : danger détecté ${caught(c.safety_device.all)} sur le téléphone, ${caught(c.safety_pipeline.all)} en ligne (n = ${c.n}).`,
      { x: 0.5, y: 3.75, w: 9, h: 0.5, fontFace: BODY, fontSize: 13, color: C.ink, margin: 0 },
    );
  }
  s.addText(
    h?.n ? `Phrases écrites à la main par l'équipe : n = ${h.n} (voir Labo).` : "Prochaine étape : des phrases écrites à la main par l'équipe, mesurées de la même façon.",
    { x: 0.5, y: 4.3, w: 9, h: 0.4, fontFace: BODY, fontSize: 13, italic: true, color: C.ink2, margin: 0 },
  );
  foot(s, "Phrases darija synthétiques : écrites par une IA (qwen), filtrées par une IA, pas par de vrais utilisateurs. Petit n : à lire avec prudence.");
}

// 7 — Replay
{
  const s = base();
  title(s, "Replay : ton esprit contre la réalité");
  s.addText("Tu notes ta prédiction et ta certitude. Plus tard, tu racontes ce qui s'est passé.", { x: 0.5, y: 1.25, w: 5, h: 0.8, fontFace: BODY, fontSize: 15, color: C.ink, margin: 0 });
  s.addText("« Sur tes 7 prédictions vérifiées, le pire est arrivé 1 fois sur 7. »", { x: 0.5, y: 2.2, w: 5, h: 0.9, fontFace: TITLE, fontSize: 18, italic: true, color: C.scen, margin: 0 });
  s.addText("Ce chiffre est calculé sur le téléphone, à partir de ses propres réponses. L'IA n'invente jamais de probabilité.", { x: 0.5, y: 3.2, w: 5, h: 0.8, fontFace: BODY, fontSize: 12, color: C.ink2, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 1.3, w: 3.3, h: 2.9, fill: { color: C.surface }, line: { color: C.line, width: 1 } });
  s.addText("1 fois sur 7", { x: 6.4, y: 1.6, w: 2.9, h: 0.9, fontFace: TITLE, fontSize: 36, bold: true, color: C.scen, margin: 0 });
  s.addText("le pire est arrivé, alors que Yassine était sûr à 60–90 % à chaque fois", { x: 6.4, y: 2.6, w: 2.9, h: 1.2, fontFace: BODY, fontSize: 13, color: C.ink, valign: "top", margin: 0 });
  foot(s, "Exemple : démo fictive de Yassine (30 jours), marquée « Exemple » dans l'app.");
}

// 8 — Platform
{
  const s = base();
  title(s, "Autour du tri");
  const items = [
    ["Humeur en un geste", "5 niveaux, émotions facultatives", C.focus],
    ["Suivi 24 h · 7 j · 30 j", "humeur, zones, étapes faites, prédictions", C.scen],
    ["Respirer", "le soupir cyclique a amélioré l'humeur et ralenti la respiration (Stanford, 2023)", C.acc],
    ["Questionnaire de la semaine", "GAD-7 : score et tendance, jamais d'étiquette", C.act],
    ["Cartes à lire", "une idée par carte, brouillons à relire par un·e psychologue", C.ink2],
    ["Tes données restent à toi", "sur le téléphone, sans compte ; seul le texte à trier part vers l'IA", C.ink],
  ];
  items.forEach(([h, b, c], i) => {
    const x = 0.5 + (i % 2) * 4.6;
    const y = 1.25 + Math.floor(i / 2) * 1.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.09, h: 0.95, fill: { color: c }, line: { color: c, width: 0 } });
    s.addText(h, { x: x + 0.25, y, w: 4.1, h: 0.4, fontFace: TITLE, fontSize: 15, bold: true, color: C.ink, margin: 0 });
    s.addText(b, { x: x + 0.25, y: y + 0.42, w: 4.1, h: 0.55, fontFace: BODY, fontSize: 11, color: C.ink2, valign: "top", margin: 0 });
  });
}

// 9 — Tech + latency
{
  const s = base();
  title(s, "Comment c'est construit");
  s.addText(
    [
      { text: "Next.js + TypeScript, déployé sur Vercel", options: { bullet: true, breakLine: true } },
      { text: "IA : Groq, gpt-oss-20b (repli 120b), sortie JSON stricte", options: { bullet: true, breakLine: true } },
      { text: "Deux modèles entraînés (scikit-learn) qui tournent dans le navigateur, même résultat qu'en Python à 10⁻⁶ près", options: { bullet: true, breakLine: true } },
      { text: "Le tri du téléphone s'affiche tout de suite, l'IA l'affine ensuite", options: { bullet: true } },
    ],
    { x: 0.5, y: 1.2, w: 5.2, h: 3, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 8, valign: "top", margin: 0 },
  );
  const lat = M.latency;
  if (lat) stat(s, 6.2, 1.2, 3.3, `${(Math.floor(lat.client_ms_p50 / 100) / 10).toFixed(1).replace(".", ",")} s`, `temps médian de l'IA par tri de jusqu'à 12 lignes\n(${lat.requests} requêtes, app déployée)`, C.focus);
  else if (LAT) stat(s, 6.2, 1.2, 3.3, "mesuré", "voir docs/measurements", C.focus);
  foot(s, "Code : github.com/ilyasdaoudrma/braver (privé) · mesures : page Labo de l'app.");
}

// 10 — Close
{
  const s = base(true);
  s.addText("Vide ta tête.", { x: 0.5, y: 1.6, w: 9, h: 1, fontFace: TITLE, fontSize: 48, bold: true, color: C.paper, margin: 0 });
  s.addText("braver-omega.vercel.app", { x: 0.5, y: 2.7, w: 9, h: 0.6, fontFace: BODY, fontSize: 20, color: "D7DCE5", margin: 0 });
  [C.scen, C.act, C.acc].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: 0.5 + i * 0.45, y: 3.6, w: 0.3, h: 0.3, fill: { color: c }, line: { color: c, width: 0 } }));
  foot(s, "BRAVER ne remplace pas un professionnel. En danger : 19 ou 112.", true);
}

pres.writeFile({ fileName: OUT }).then((f) => console.log(`wrote ${f}`));
