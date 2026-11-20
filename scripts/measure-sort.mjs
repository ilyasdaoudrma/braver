// Measures N sorts against a deployed BRAVER: client latency p50 / p90 and which model answered.
// Usage: node scripts/measure-sort.mjs https://braver-omega.vercel.app [runs=30] [gapSeconds=20]
// Writes docs/measurements/sort-latency-<timestamp>.json and prints a Markdown table.
// Sentences come from the prototype's dossier list (not from any held-out test set). Safety cases are excluded.
import { mkdirSync, writeFileSync } from "node:fs";

const [base, runsArg = "30", gapArg = "20"] = process.argv.slice(2);
if (!base) {
  console.error("Usage: node scripts/measure-sort.mjs <base-url> [runs] [gapSeconds]");
  process.exit(1);
}
const RUNS = Number(runsArg);
const GAP_MS = Number(gapArg) * 1000;

const POOL = [
  "Je vais rater mon entretien demain, j'en suis sûr.",
  "Tout le monde va se moquer de moi pendant l'exposé.",
  "Mon prof me déteste, c'est pour ça que j'ai eu 9.",
  "Je n'ai toujours pas envoyé mon dossier de stage.",
  "Je dois parler du bruit à mon coloc mais je repousse depuis un mois.",
  "Je n'ai pas commencé à réviser et l'examen est dans 5 jours.",
  "Mon père a perdu son travail.",
  "Ma grand-mère est décédée la semaine dernière.",
  "Je n'ai pas été prise au master.",
  "Mazal ma siftsh dossier dyal stage.",
  "Ana met2ked ma ghadich ndouz l'entretien ghedda.",
  "Kolchi ghadi yd7ek 3liya f l'exposé.",
  "Bba khrjouh mn lkhedma.",
  "ما بقيتش قادر نقرا، كنأجل كلشي",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Nearest-rank percentile, no interpolation, no rounding up. */
const pct = (sorted, p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const lines = [0, 1, 2].map((k) => POOL[(i * 3 + k) % POOL.length]);
  const started = performance.now();
  let status = 0;
  let body = null;
  try {
    const res = await fetch(new URL("/api/sort", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worries: lines.map((text) => ({ text })), tone: "doux" }),
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch (err) {
    body = { ok: false, error: err?.name === "TimeoutError" ? "timeout" : "network" };
  }
  const ms = Math.floor(performance.now() - started);
  const answeredBy = body?.ok ? body.model : "on-device (LLM failed)";
  runs.push({ i: i + 1, lines: lines.length, status, ms, serverMs: body?.ok ? body.ms : null, answeredBy, error: body?.ok ? null : body?.error });
  console.error(`${i + 1}/${RUNS} ${status} ${ms} ms ${answeredBy}`);
  if (i < RUNS - 1) await sleep(GAP_MS);
}

const okMs = runs.filter((r) => r.status === 200).map((r) => r.ms).sort((a, b) => a - b);
const allMs = runs.map((r) => r.ms).sort((a, b) => a - b);
const share = {};
for (const r of runs) share[r.answeredBy] = (share[r.answeredBy] ?? 0) + 1;

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("docs/measurements", { recursive: true });
const file = `docs/measurements/sort-latency-${stamp}.json`;
writeFileSync(file, JSON.stringify({ base, at: new Date().toISOString(), runs: RUNS, gapSeconds: GAP_MS / 1000, linesPerSort: 3, results: runs }, null, 2));

const md = [
  `Measured ${new Date().toISOString().slice(0, 16)}Z on ${base}, ${RUNS} sorts of 3 worries, one every ${GAP_MS / 1000} s, client-side latency (fetch round trip).`,
  "",
  "| Metric | Value |",
  "|---|---|",
  `| Sorts | ${RUNS} |`,
  `| p50 latency, all sorts | ${pct(allMs, 50)} ms |`,
  `| p90 latency, all sorts | ${pct(allMs, 90)} ms |`,
  `| p50 / p90, LLM answers only (n = ${okMs.length}) | ${okMs.length ? `${pct(okMs, 50)} ms / ${pct(okMs, 90)} ms` : "n/a"} |`,
  `| min / max | ${allMs[0]} ms / ${allMs[allMs.length - 1]} ms |`,
  ...Object.entries(share).map(([k, v]) => `| Answered by ${k} | ${v} / ${RUNS} |`),
  "",
  `Raw data: \`${file}\``,
].join("\n");
console.log(md);
