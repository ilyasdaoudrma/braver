// E1 step 2: the LLM layer as the app runs it — POST /api/sort on the DEPLOYED app (gpt-oss-20b → 120b fallback).
// Only lines the device does NOT stop are sent (a device alert never reaches the network in the app).
// Budget: the 20b has ~200k tokens/day shared with the demo, so this sends a STRATIFIED SAMPLE
// (per set × language × label), 12 lines per request, cached on disk (resumable). n is reported with every metric.
// Usage: node ml/eval/llm_eval.mjs https://braver-omega.vercel.app [perCell=12] [gapSeconds=20]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [base, perCellArg = "12", gapArg = "20"] = process.argv.slice(2);
if (!base) {
  console.error("Usage: node ml/eval/llm_eval.mjs <base-url> [perCell] [gapSeconds]");
  process.exit(1);
}
const PER_CELL = Number(perCellArg);
const GAP_MS = Number(gapArg) * 1000;
const CACHE = "ml/eval/data/cache/llm";
mkdirSync(CACHE, { recursive: true });

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}
const cell = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// Deterministic "random" order: sort by sha256(id) so the sample is reproducible.
const h = (s) => createHash("sha256").update(s).digest("hex");
const rows = parseCsv(readFileSync("ml/eval/data/device_predictions.csv", "utf-8"));
const cells = new Map();
for (const r of rows) {
  const key = `${r.set}|${r.lang}|${r.set === "zones_test" ? r.label_zone : r.label_danger}`;
  if (!cells.has(key)) cells.set(key, []);
  cells.get(key).push(r);
}
const sample = [];
for (const [, list] of [...cells.entries()].sort()) {
  // hand-written rows are all kept (small, and the most valuable)
  const keepAll = list[0].set === "darija_handwritten";
  sample.push(...[...list].sort((a, b) => h(a.id).localeCompare(h(b.id))).slice(0, keepAll ? list.length : PER_CELL));
}
const toSend = sample.filter((r) => r.safety_level !== "danger");
console.log(`sample ${sample.length} lines, ${sample.length - toSend.length} stopped on the device, ${toSend.length} sent in batches of 12`);

const out = [];
for (let i = 0; i < toSend.length; i += 12) {
  const batch = toSend.slice(i, i + 12);
  const key = h(JSON.stringify(batch.map((r) => r.text)));
  const file = `${CACHE}/${key.slice(0, 32)}.json`;
  let res;
  if (existsSync(file)) res = JSON.parse(readFileSync(file, "utf-8"));
  else {
    const started = performance.now();
    let body = null;
    try {
      const r = await fetch(new URL("/api/sort", base), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worries: batch.map((r) => ({ text: r.text.slice(0, 500) })), tone: "doux" }),
        signal: AbortSignal.timeout(30_000),
      });
      body = await r.json().catch(() => null);
    } catch (err) {
      body = { ok: false, error: err?.name === "TimeoutError" ? "timeout" : "network" };
    }
    res = { clientMs: Math.round(performance.now() - started), body };
    if (body?.ok) writeFileSync(file, JSON.stringify(res), "utf-8"); // failures are not cached: a re-run retries them
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  const items = new Map((res.body?.ok ? res.body.items : []).map((it) => [it.n, it]));
  batch.forEach((r, j) => {
    const it = items.get(j + 1);
    out.push({ set: r.set, id: r.id, llm_ok: it ? 1 : 0, llm_danger: it ? (it.danger ? 1 : 0) : "", llm_distress: it ? (it.distress ? 1 : 0) : "", llm_zone: it?.zone ?? "", model: res.body?.ok ? res.body.model : "", server_ms: res.body?.ok ? res.body.ms : "", client_ms: res.clientMs, failure: res.body?.ok ? "" : res.body?.error ?? "unknown" });
  });
  console.log(`${Math.min(i + 12, toSend.length)}/${toSend.length} ${res.body?.ok ? res.body.model : res.body?.error} ${res.clientMs} ms`);
}

const sampled = new Set(sample.map((r) => `${r.set}|${r.id}`));
writeFileSync("ml/eval/data/sample_ids.csv", ["set,id", ...[...sampled].map((k) => k.split("|").map(cell).join(","))].join("\n") + "\n", "utf-8");
const cols = ["set", "id", "llm_ok", "llm_danger", "llm_distress", "llm_zone", "model", "server_ms", "client_ms", "failure"];
writeFileSync("ml/eval/data/llm_predictions.csv", [cols.join(","), ...out.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n", "utf-8");
console.log(`saved ${out.length} LLM rows`);
