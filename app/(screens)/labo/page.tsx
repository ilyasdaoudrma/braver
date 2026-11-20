import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LaboView, type LaboMetrics } from "@/components/labo/LaboView";

export const metadata: Metadata = { title: "Labo" };

// Written by ml/eval/report.py; read at build time (static page).
const FILE = path.join(process.cwd(), "public", "labo", "metrics.json");

function loadMetrics(): LaboMetrics | null {
  if (!existsSync(FILE)) return null;
  try {
    return JSON.parse(readFileSync(FILE, "utf-8")) as LaboMetrics;
  } catch {
    return null;
  }
}

export default function LaboPage() {
  return <LaboView metrics={loadMetrics()} />;
}
