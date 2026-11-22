// Replay: predictions noted on scenario cards, checked later against what happened.
// Every number shown to the person ("le pire est arrivé 1 fois sur 8") is computed HERE from their own entries.
// The LLM never produces a number (CLAUDE.md).
import type { ApiReplayResponse, ReplayRequest } from "./sort/api";
import { guardText } from "./guards";
import type { ReplayEntry, SortSource, WorstHappened } from "./types";
import { currentAiParts } from "./ai/client";

export const CHECK_DELAYS = [
  { days: 1, label: "Demain" },
  { days: 3, label: "Dans 3 jours" },
  { days: 7, label: "Dans 1 semaine" },
] as const;

/** Local calendar date YYYY-MM-DD, `days` after `from`. */
export function addDays(from: Date, days: number): string {
  const d = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + days,
  );
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayKey(now: Date = new Date()): string {
  return addDays(now, 0);
}

export interface NewPrediction {
  id: string;
  worryId: string | null;
  text: string;
  prediction: string;
  question: string | null;
  certainty: number;
  days: number;
}

export function makeEntry(
  p: NewPrediction,
  now: Date = new Date(),
): ReplayEntry {
  return {
    id: p.id,
    worryId: p.worryId,
    text: p.text,
    prediction: p.prediction,
    question: p.question,
    certainty: Math.min(100, Math.max(0, Math.round(p.certainty))),
    checkAt: addDays(now, p.days),
    createdAt: now.toISOString(),
    status: "pending",
    outcome: null,
    worstHappened: null,
    comment: null,
    commentSource: null,
  };
}

export interface ReplayGroups {
  due: ReplayEntry[];
  later: ReplayEntry[];
  done: ReplayEntry[];
}

/** Pending entries whose date has come (oldest first), pending later ones, and checked ones (newest first). */
export function groupEntries(
  entries: readonly ReplayEntry[],
  today: string = todayKey(),
): ReplayGroups {
  const pending = entries
    .filter((e) => e.status === "pending")
    .sort((a, b) => a.checkAt.localeCompare(b.checkAt));
  return {
    due: pending.filter((e) => e.checkAt <= today),
    later: pending.filter((e) => e.checkAt > today),
    done: entries
      .filter((e) => e.status === "done")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
  };
}

export interface CalibrationBucket {
  /** Inclusive lower bound and exclusive upper bound of the certainty (last bucket includes 100). */
  from: number;
  to: number;
  n: number;
  worst: number;
  partly: number;
  /** Mean certainty of the entries in this bucket, 0–100 (null when empty). */
  meanCertainty: number | null;
}

export interface Calibration {
  /** True when only the fictional demo entries are counted (the person has none of their own yet). */
  demo: boolean;
  n: number;
  worst: number;
  partly: number;
  buckets: CalibrationBucket[];
}

const BOUNDS = [0, 20, 40, 60, 80, 101];

/** Calibration from the person's own checked predictions. */
export function calibration(entries: readonly ReplayEntry[]): Calibration {
  const checked = entries.filter((e) => e.status === "done" && e.worstHappened);
  // The person's own entries only; the demo counts only while they have none (and is then labelled).
  const own = checked.filter((e) => !e.demo);
  const done = own.length ? own : checked;
  const buckets: CalibrationBucket[] = BOUNDS.slice(0, -1).map((from, i) => {
    const to = BOUNDS[i + 1];
    const inside = done.filter((e) => e.certainty >= from && e.certainty < to);
    return {
      from,
      to: Math.min(to, 100),
      n: inside.length,
      worst: inside.filter((e) => e.worstHappened === "oui").length,
      partly: inside.filter((e) => e.worstHappened === "en_partie").length,
      meanCertainty: inside.length
        ? inside.reduce((s, e) => s + e.certainty, 0) / inside.length
        : null,
    };
  });
  return {
    demo: own.length === 0 && done.length > 0,
    n: done.length,
    worst: done.filter((e) => e.worstHappened === "oui").length,
    partly: done.filter((e) => e.worstHappened === "en_partie").length,
    buckets,
  };
}

/** "le pire est arrivé 1 fois sur 8" — exact counts, never a rounded percentage. */
export function worstSentence(
  c: Pick<Calibration, "n" | "worst" | "partly">,
): string | null {
  if (!c.n) return null;
  const times = (k: number) => `${k} fois`;
  const intro =
    c.n > 1
      ? `Sur tes ${c.n} prédictions vérifiées`
      : "Sur ta prédiction vérifiée";
  const base = `${intro}, le pire est arrivé ${times(c.worst)} sur ${c.n}`;
  return c.partly ? `${base}, en partie ${times(c.partly)}.` : `${base}.`;
}

/** Comment made on the phone when the LLM does not answer. No number, no reassurance. */
export function localComment(
  entry: Pick<ReplayEntry, "prediction" | "certainty">,
  worst: WorstHappened,
): string {
  if (worst === "non")
    return `Tu étais sûr·e à ${entry.certainty} % que « ${entry.prediction} ». Ce n'est pas ce qui s'est passé. Garde cette trace pour la prochaine fois que ton esprit prédit la même chose.`;
  if (worst === "en_partie")
    return "Une partie seulement de ce que tu craignais est arrivée. Qu'est-ce qui s'est passé autrement que prévu ?";
  return "C'est arrivé comme tu le craignais. Ce que tu ressens est légitime. Qu'est-ce qui t'a aidé à traverser ce moment ?";
}

export const REPLAY_TIMEOUT_MS = 15_000;

/** Asks /api/replay for a short comment; falls back to the local one. Never throws. */
export async function fetchComment(
  entry: ReplayEntry,
  outcome: string,
  worst: WorstHappened,
  fetchImpl: typeof fetch = fetch,
): Promise<{ comment: string; source: SortSource; model: string | null }> {
  const personal = currentAiParts();
  const body: ReplayRequest = {
    prediction: entry.prediction,
    outcome,
    certainty: entry.certainty,
    worstHappened: worst,
    ai: personal.ai,
  };
  try {
    const res = await fetchImpl("/api/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...personal.headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REPLAY_TIMEOUT_MS),
    });
    const data = (await res.json()) as ApiReplayResponse;
    if (data.ok && data.comment.trim()) {
      const safe = guardText(data.comment, "").text;
      if (safe) return { comment: safe, source: "llm", model: data.model };
    }
  } catch {
    // network error or timeout: local comment below
  }
  return { comment: localComment(entry, worst), source: "device", model: null };
}
