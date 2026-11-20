// Shared helpers for the two hackathon decks (22 Nov 2026): palette of the app, fonts, the scroll-like scene
// (same Oujda sky from dawn to night + three zone orbs that Morph moves between slides), and the measured numbers.
// Every number comes from a file written by the evaluation scripts; nothing is typed by hand.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ASSETS = path.join(__dirname, "assets");
const A = (f) => path.join(ASSETS, f);
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf-8"));

const C = {
  paper: "FAF6F0", surface: "FDFBF7", surface2: "F1EBE2", ink: "1B2333", ink2: "566175", line: "E6DED2",
  scenario: "5B3FD6", scenarioSoft: "ECE8FC", action: "B93D0A", actionSoft: "FBE9DF",
  acceptation: "0B7065", acceptationSoft: "DFF2EE", danger: "C81D25", dangerSoft: "FBE3E4", night: "141A33", moon: "F0ECFF",
};
const F = { light: "Segoe UI Light", body: "Segoe UI", bold: "Segoe UI Semibold", serif: "Georgia" };

/** Truncated, never rounded up. */
const trunc = (x, d) => Math.floor(x * 10 ** d + 1e-9) / 10 ** d;
const pct = (x) => `${trunc(x * 100, 2).toFixed(2).replace(".", ",")} %`;
const dec = (x, d = 4) => trunc(x, d).toFixed(d).replace(".", ",");

function numbers() {
  const m = read("public/labo/metrics.json");
  const hc = read("ml/zones/results/human_check.json");
  const ag = read("ml/zones/results/agreement.json");
  const s = m.sets.safety_test, z = m.sets.zones_test;
  const dev = s.safety_device.all, pipe = s.safety_pipeline.all;
  return {
    m, hc, ag,
    safety: { dev, recall: dev.danger.recall, dangerN: dev.danger.support, n: dev.n, pipe, onlineCaught: pipe.confusion[1][1], onlineDanger: pipe.confusion[1][0] + pipe.confusion[1][1], onlineFalse: pipe.confusion[0][1], onlineSafe: pipe.confusion[0][0] + pipe.confusion[0][1], onlineN: pipe.n },
    zones: { dev: z.zones_device.all, pipe: z.zones_pipeline.all },
    latency: m.latency,
    darija: m.sets.darija_claude || null,
    synthetic: m.sets.darija_synthetic || null,
  };
}

/** The scene shared by every slide: sky picture, paper veil, three orbs. Morph pairs them by name ("!!…"). */
function scene(pres, slide, { sky = "dawn", veil = 0, orbs }) {
  slide.background = { color: sky === "night" ? C.night : C.paper };
  slide.addImage({ path: A(`sky-${sky}.jpg`), x: 0, y: 0, w: 10, h: 5.625, objectName: "!!sky" });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.paper, transparency: 100 - veil }, line: { type: "none" }, objectName: "!!veil" });
  if (orbs) addOrbs(slide, orbs);
}

/** The three zone orbs (Morph pairs them across slides by name). Call last to draw them above the content. */
function addOrbs(slide, orbs) {
  for (const [key, o] of Object.entries(orbs)) {
    slide.addImage({ path: A(`orb-${key}.png`), x: o[0], y: o[1], w: o[2], h: o[2], objectName: `!!orb-${key}` });
  }
}

/** Text with one serif italic accent word: parts = ["Vide ta ", "tête", "."] → middle part in Georgia italic. */
function accentRuns(parts, base) {
  return parts.map((t, i) => ({ text: t, options: i === 1 ? { ...base, fontFace: F.serif, italic: true } : { ...base } }));
}

/** Glass-like card (paper, slightly transparent, soft shadow). */
function card(pres, slide, x, y, w, h, name, { fill = C.surface, transparency = 8, dark = false } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.16, objectName: name,
    fill: { color: dark ? C.night : fill, transparency: dark ? 25 : transparency },
    line: { color: dark ? "5A6390" : C.line, width: 0.75 },
    shadow: { type: "outer", color: "1B2333", blur: 18, offset: 6, angle: 90, opacity: dark ? 0.35 : 0.14 },
  });
}

function eyebrow(slide, text, x, y, name, color = C.ink2) {
  slide.addText(text, { x, y, w: 6, h: 0.3, fontFace: F.bold, fontSize: 10, color, charSpacing: 3, margin: 0, objectName: name });
}

function logo(slide, x, y, name, color = C.ink) {
  slide.addImage({ path: A("orb-scenario.png"), x, y: y + 0.02, w: 0.26, h: 0.26, objectName: `${name}-orb` });
  slide.addText("BRAVER", { x: x + 0.33, y, w: 1.6, h: 0.3, fontFace: F.bold, fontSize: 13, color, margin: 0, objectName: name });
}

module.exports = { ROOT, A, C, F, pct, dec, trunc, numbers, scene, addOrbs, accentRuns, card, eyebrow, logo };
