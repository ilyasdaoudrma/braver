"use client";
// On-device zone model (M2): public/models/zones.json, trained in ml/zones/train.py.
// Replaces the prototype's keyword rules as the offline sorter; the rules stay only as a fallback
// while the model is not loaded (or if its file is broken).
import { predictProba, prepareModel, type CharModel, type LoadedModel } from "../charmodel";
import { deviceZone as ruleZone } from "../sort/rules";
import { ZONES, type Zone } from "../types";

export const ZONES_MODEL_URL = "/models/zones.json";

let loaded: LoadedModel | null = null;
let loading: Promise<LoadedModel | null> | null = null;

const finite = (xs: unknown): boolean => Array.isArray(xs) && xs.every((v) => typeof v === "number" && Number.isFinite(v));

export function isZonesModel(x: unknown): x is CharModel {
  const m = x as Partial<CharModel> | null;
  if (!m || m.kind !== "char_wb_tfidf_logreg" || !Array.isArray(m.terms) || !Array.isArray(m.coef) || !Array.isArray(m.classes)) return false;
  const n = m.terms.length;
  return (
    n > 0 &&
    m.classes.length === ZONES.length &&
    ZONES.every((z) => m.classes!.includes(z)) &&
    m.coef.length === ZONES.length &&
    m.coef.every((row) => finite(row) && row.length === n) &&
    finite(m.idf) &&
    (m.idf as number[]).length === n &&
    finite(m.intercept) &&
    (m.intercept as number[]).length === ZONES.length
  );
}

export function getZonesModel(): LoadedModel | null {
  return loaded;
}

export function loadZonesModel(fetchImpl: typeof fetch = fetch): Promise<LoadedModel | null> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= fetchImpl(ZONES_MODEL_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => {
      if (!isZonesModel(json)) return null;
      loaded = prepareModel(json);
      return loaded;
    })
    .catch(() => null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function setZonesModelForTests(model: CharModel | null): void {
  loaded = model ? prepareModel(model) : null;
}

export interface ZoneGuess {
  zone: Zone;
  /** Probability per zone (model), or null when the keyword rules decided. */
  proba: Record<Zone, number> | null;
  by: "model" | "rules";
}

/** Zone on the device: the trained model when loaded, else the prototype's keyword rules. */
export function zoneOnDevice(text: string, model: LoadedModel | null = loaded): ZoneGuess {
  if (model) {
    const p = predictProba(model, text);
    if (p.every(Number.isFinite)) {
      const proba = Object.fromEntries(model.model.classes.map((c, i) => [c, p[i]])) as Record<Zone, number>;
      const zone = ZONES.reduce<Zone>((best, z) => (proba[z] > proba[best] ? z : best), ZONES[0]);
      return { zone, proba, by: "model" };
    }
  }
  return { zone: ruleZone(text).zone, proba: null, by: "rules" };
}
