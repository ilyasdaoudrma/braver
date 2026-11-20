// E1 step 1: on-device layers on every held-out set (no network, no Groq cost), exactly the browser code.
// Run: npx jiti ml/eval/device_eval.ts
// Writes ml/eval/data/device_predictions.csv: set, id, lang, source, text, label_danger, label_zone,
// safety_level (danger | check | hopeless | none), safety_score, zone_device, zone_by.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { prepareModel, type CharModel } from "../../lib/charmodel";
import { checkSafety, type SafetyModel } from "../../lib/safety/pipeline";
import { zoneOnDevice } from "../../lib/zones/model";

/** Minimal RFC 4180 CSV parser (quotes, doubled quotes, newlines inside quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface EvalRow {
  set: string;
  id: string;
  lang: string;
  source: string;
  text: string;
  label_danger: string; // "1" | "0" | "" (not labelled for this task)
  label_zone: string; // zone | ""
}

function load(path: string, set: string, map: (r: Record<string, string>) => Omit<EvalRow, "set">): EvalRow[] {
  if (!existsSync(path)) return [];
  return parseCsv(readFileSync(path, "utf-8")).map((r) => ({ set, ...map(r) }));
}

const safety = prepareModel(JSON.parse(readFileSync("public/models/safety.json", "utf-8")) as SafetyModel);
const zones = existsSync("public/models/zones.json") ? prepareModel(JSON.parse(readFileSync("public/models/zones.json", "utf-8")) as CharModel) : null;

const rows: EvalRow[] = [
  ...load("ml/safety/data/splits/test.csv", "safety_test", (r) => ({ id: r.id, lang: r.lang, source: r.source, text: r.text, label_danger: r.label, label_zone: "" })),
  ...load("ml/zones/data/splits/test.csv", "zones_test", (r) => ({ id: r.id, lang: r.lang, source: r.source, text: r.text, label_danger: "0", label_zone: r.label })),
  ...load("ml/eval/data/darija_synthetic.csv", "darija_synthetic", (r) => ({ id: r.id, lang: r.lang, source: r.source, text: r.text, label_danger: r.danger, label_zone: r.zone })),
  ...load("ml/eval/data/darija_handwritten.csv", "darija_handwritten", (r) => ({ id: r.id, lang: r.lang, source: "handwritten", text: r.text, label_danger: r.danger, label_zone: r.zone })),
].filter((r) => r.text.trim());

const out = rows.map((r) => {
  const s = checkSafety(r.text, safety);
  const z = zoneOnDevice(r.text, zones);
  return { ...r, safety_level: s.level, safety_score: s.score ?? "", zone_device: z.zone, zone_by: z.by };
});

mkdirSync("ml/eval/data", { recursive: true });
const cols = ["set", "id", "lang", "source", "text", "label_danger", "label_zone", "safety_level", "safety_score", "zone_device", "zone_by"] as const;
writeFileSync(
  "ml/eval/data/device_predictions.csv",
  [cols.join(","), ...out.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n",
  "utf-8",
);
const bySet = out.reduce<Record<string, number>>((a, r) => ({ ...a, [r.set]: (a[r.set] ?? 0) + 1 }), {});
console.log("device predictions:", JSON.stringify(bySet));
