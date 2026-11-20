// On-device safety pipeline (runs BEFORE any network call), one line at a time:
//   1. keywords (lib/keywords.ts): explicit danger → alert
//   2. trained model (public/models/safety.json): score ≥ high → alert; threshold ≤ score < high → "check"
//   3. "check" = ambiguous: the LLM decides; no answer / offline → alert (lib/sort/engine.ts)
// A figurative keyword ("ce partiel va me tuer") is cleared by the model only when its score is FAR below the
// threshold (< threshold × DOUBT_CLEAR_FACTOR): the threshold was tuned on all lines, not on lines that already
// contain an ambiguous word, so between the two the line still goes to the LLM (offline → alert).
// Thresholds are tuned on the validation split only (ml/safety/train.py).
import { checkKeywords } from "../keywords";
import { predictProba, type CharModel, type LoadedModel } from "../charmodel";

export interface SafetyModel extends CharModel {
  /** Below: no danger. */
  threshold: number;
  /** At or above: the device alerts without waiting for the LLM. */
  high: number;
}

export const DOUBT_CLEAR_FACTOR = 0.5;

export type SafetyLevel = "danger" | "check" | "hopeless" | "none";

export interface SafetyCheck {
  level: SafetyLevel;
  /** What decided the level. */
  by: "keywords" | "model" | "keywords+model" | "none";
  /** Danger probability from the model, null when the model is not loaded. */
  score: number | null;
  /** Keyword or pattern that matched, if any. */
  match: string | null;
}

export function checkSafety(text: string, model: LoadedModel<SafetyModel> | null): SafetyCheck {
  const kw = checkKeywords(text);
  if (kw.level === "danger") return { level: "danger", by: "keywords", score: null, match: kw.match };
  const raw = model ? predictProba(model, text)[1] : null;
  // A broken model (NaN) is treated as no model: never let it clear anything.
  const score = raw !== null && Number.isFinite(raw) ? raw : null;
  if (score !== null && model) {
    const { threshold, high } = model.model;
    if (score >= high) return { level: "danger", by: kw.level === "none" ? "model" : "keywords+model", score, match: kw.match };
    // Hopelessness words (CLAUDE.md): gentle check-in card, not an alert. Online, the LLM still checks every line for danger.
    if (kw.level === "hopeless") return { level: "hopeless", by: "keywords+model", score, match: kw.match };
    if (score >= threshold) return { level: "check", by: kw.level === "doubt" ? "keywords+model" : "model", score, match: kw.match };
    if (kw.level === "doubt") {
      const cleared = score < threshold * DOUBT_CLEAR_FACTOR;
      return { level: cleared ? "none" : "check", by: "keywords+model", score, match: kw.match };
    }
  } else if (kw.level === "doubt") {
    // No model: an ambiguous word must be checked by the LLM (offline → alert).
    return { level: "check", by: "keywords", score, match: kw.match };
  }
  if (kw.level === "hopeless") return { level: "hopeless", by: "keywords", score, match: kw.match };
  return { level: "none", by: "none", score, match: null };
}
