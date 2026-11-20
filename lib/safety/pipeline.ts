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
  /**
   * Option B: between `keep` and `high` the line still goes to the LLM, but the alert stays even if the LLM says
   * "no danger" (it missed true Darija danger lines in E1). Chosen on validation only (ml/safety/train.py).
   * Optional so an older model file keeps working (then the LLM decides the whole band).
   */
  keep?: number;
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
  /** level "check" with a score ≥ keep: the LLM cannot clear this alert (option B). */
  firm: boolean;
}

export function checkSafety(text: string, model: LoadedModel<SafetyModel> | null): SafetyCheck {
  const kw = checkKeywords(text);
  if (kw.level === "danger") return { level: "danger", by: "keywords", score: null, match: kw.match, firm: false };
  const raw = model ? predictProba(model, text)[1] : null;
  // A broken model (NaN) is treated as no model: never let it clear anything.
  const score = raw !== null && Number.isFinite(raw) ? raw : null;
  if (score !== null && model) {
    const { threshold, high } = model.model;
    const keep = typeof model.model.keep === "number" ? model.model.keep : Number.POSITIVE_INFINITY;
    if (score >= high) return { level: "danger", by: kw.level === "none" ? "model" : "keywords+model", score, match: kw.match, firm: false };
    // Hopelessness words (CLAUDE.md): gentle check-in card, not an alert. Online, the LLM still checks every line for danger.
    if (kw.level === "hopeless") return { level: "hopeless", by: "keywords+model", score, match: kw.match, firm: false };
    if (score >= threshold) return { level: "check", by: kw.level === "doubt" ? "keywords+model" : "model", score, match: kw.match, firm: score >= keep };
    if (kw.level === "doubt") {
      const cleared = score < threshold * DOUBT_CLEAR_FACTOR;
      return { level: cleared ? "none" : "check", by: "keywords+model", score, match: kw.match, firm: false };
    }
  } else if (kw.level === "doubt") {
    // No model: an ambiguous word must be checked by the LLM (offline → alert).
    return { level: "check", by: "keywords", score, match: kw.match, firm: false };
  }
  if (kw.level === "hopeless") return { level: "hopeless", by: "keywords", score, match: kw.match, firm: false };
  return { level: "none", by: "none", score, match: null, firm: false };
}
