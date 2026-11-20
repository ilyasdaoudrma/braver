// I3 memory: which past worries look like this one (embeddings, cosine), and what their Replay says.
// Pure functions. Every number shown comes from the person's own data, computed here (CLAUDE.md).
import type { EmbeddingEntry, ReplayEntry, Worry } from "../types";

/** e5 vectors are normalised, so the cosine is the dot product. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Similarity above which two worries count as "the same worry again". multilingual-e5 gives high cosines even to
 * unrelated sentences: in a manual check (20 Nov) "Je vais rater mon examen de compta demain" vs
 * "j'ai peur de rater l'examen de compta demain" = 0.968, but vs "Ma grand-mère est malade" = 0.873 / 0.863.
 * So the bar is 0.92. Chosen on these hand-made examples, not on any test set.
 */
export const SIMILAR_FROM = 0.92;

export interface Similar {
  worryId: string;
  score: number;
}

export function similarWorries(
  vector: readonly number[],
  entries: readonly EmbeddingEntry[],
  opts: { exclude?: ReadonlySet<string>; k?: number; min?: number; model?: string } = {},
): Similar[] {
  const { exclude = new Set(), k = 3, min = SIMILAR_FROM, model } = opts;
  return entries
    .filter((e) => !exclude.has(e.worryId) && (!model || e.model === model))
    .map((e) => ({ worryId: e.worryId, score: cosine(vector, e.vector) }))
    .filter((s) => s.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export interface MemorySummary {
  /** Similar worries written before (top-k). */
  similar: number;
  /** Among their checked predictions: how many, and how often the worst happened. */
  checked: number;
  worst: number;
}

export function summarize(similar: readonly Similar[], worries: readonly Worry[], replays: readonly ReplayEntry[]): MemorySummary {
  const ids = new Set(similar.map((s) => s.worryId).filter((id) => worries.some((w) => w.id === id && !w.demo)));
  const done = replays.filter((r) => r.worryId && ids.has(r.worryId) && r.status === "done" && r.worstHappened && !r.demo);
  return { similar: ids.size, checked: done.length, worst: done.filter((r) => r.worstHappened === "oui").length };
}

/** "3ᵉ fois que tu écris ça. Le pire est arrivé 0 fois sur 2." — exact counts, nothing invented. */
export function memoryLine(m: MemorySummary): string | null {
  if (!m.similar) return null;
  const nth = m.similar + 1;
  const head = `${nth}${nth === 1 ? "ʳᵉ" : "ᵉ"} fois que tu écris quelque chose de proche.`;
  if (!m.checked) return head;
  return `${head} Sur ${m.checked === 1 ? "la prédiction vérifiée" : `les ${m.checked} prédictions vérifiées`}, le pire est arrivé ${m.worst} fois sur ${m.checked}.`;
}
