"use client";
// Loads public/models/safety.json once (lazy), keeps it in memory for the synchronous on-device sort.
import { prepareModel, type LoadedModel } from "../charmodel";
import type { SafetyModel } from "./pipeline";

export const SAFETY_MODEL_URL = "/models/safety.json";

let loaded: LoadedModel<SafetyModel> | null = null;
let loading: Promise<LoadedModel<SafetyModel> | null> | null = null;

function isSafetyModel(x: unknown): x is SafetyModel {
  const m = x as Partial<SafetyModel> | null;
  return Boolean(
    m &&
      m.kind === "char_wb_tfidf_logreg" &&
      Array.isArray(m.terms) &&
      Array.isArray(m.idf) &&
      Array.isArray(m.coef) &&
      m.coef.length === 1 &&
      m.coef[0].length === m.terms.length &&
      typeof m.threshold === "number" &&
      typeof m.high === "number",
  );
}

/** The model if it is already in memory (used by the synchronous sort). */
export function getSafetyModel(): LoadedModel<SafetyModel> | null {
  return loaded;
}

/** Fetches the model once. Resolves null on failure (the sort then relies on keywords + LLM, offline → alert). */
export function loadSafetyModel(fetchImpl: typeof fetch = fetch): Promise<LoadedModel<SafetyModel> | null> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= fetchImpl(SAFETY_MODEL_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => {
      if (!isSafetyModel(json)) return null;
      loaded = prepareModel(json);
      return loaded;
    })
    .catch(() => null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Test helper. */
export function setSafetyModelForTests(model: SafetyModel | null): void {
  loaded = model ? prepareModel(model) : null;
}
