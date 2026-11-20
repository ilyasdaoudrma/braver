import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Landing } from "@/components/landing/Landing";
import type { ProofNumbers } from "@/components/landing/Sections";

// Written by ml/eval/report.py; read at build time so the landing shows the measured numbers only.
const FILE = path.join(process.cwd(), "public", "labo", "metrics.json");

interface Conf { n: number; confusion: number[][]; danger?: { recall: number }; accuracy?: number | null }

function loadProof(): ProofNumbers {
  const empty: ProofNumbers = { safetyRecall: null, safetyN: null, onlineCaught: null, onlineDanger: null, onlineN: null, zonesAcc: null, zonesN: null };
  if (!existsSync(FILE)) return empty;
  try {
    const m = JSON.parse(readFileSync(FILE, "utf-8")) as { sets?: Record<string, Record<string, { all?: Conf }>> };
    const dev = m.sets?.safety_test?.safety_device?.all;
    const pipe = m.sets?.safety_test?.safety_pipeline?.all;
    const zones = m.sets?.zones_test?.zones_device?.all;
    return {
      safetyRecall: dev?.danger?.recall ?? null,
      safetyN: dev ? dev.confusion[1][0] + dev.confusion[1][1] : null, // recall denominator: danger messages only
      onlineCaught: pipe ? pipe.confusion[1][1] : null,
      onlineDanger: pipe ? pipe.confusion[1][0] + pipe.confusion[1][1] : null,
      onlineN: pipe?.n ?? null,
      zonesAcc: zones?.accuracy ?? null,
      zonesN: zones?.n ?? null,
    };
  } catch {
    return empty;
  }
}

export default function LandingPage() {
  return <Landing proof={loadProof()} />;
}
