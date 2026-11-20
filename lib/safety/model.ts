"use client";
// Loads public/models/safety.json once (lazy), keeps it in memory for the synchronous on-device sort.
import { prepareModel, type LoadedModel } from "../charmodel";
import type { SafetyModel } from "./pipeline";

export const SAFETY_MODEL_URL = "/models/safety.json";

let loaded: LoadedModel<SafetyModel> | null = null;
let loading: Promise<LoadedModel<SafetyModel> | null> | null = null;

const finite = (xs: unknown): boolean => Array.isArray(xs) && xs.every((v) => typeof v === "number" && Number.isFinite(v));

/** Strict shape check: a truncated or corrupted file must never be used (it could clear real danger). */
export function isSafetyModel(x: unknown): x is SafetyModel {
  const m = x as Partial<SafetyModel> | null;
  if (!m || m.kind !== "char_wb_tfidf_logreg" || !Array.isArray(m.terms) || !Array.isArray(m.coef) || m.coef.length !== 1) return false;
  const n = m.terms.length;
  return (
    n > 0 &&
    Array.isArray(m.classes) &&
    m.classes.length === 2 &&
    Array.isArray(m.ngram) &&
    m.ngram.length === 2 &&
    finite(m.idf) &&
    (m.idf as number[]).length === n &&
    finite(m.coef[0]) &&
    m.coef[0].length === n &&
    finite(m.intercept) &&
    (m.intercept as number[]).length === 1 &&
    typeof m.threshold === "number" &&
    typeof m.high === "number" &&
    m.threshold > 0 &&
    m.threshold <= m.high
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
