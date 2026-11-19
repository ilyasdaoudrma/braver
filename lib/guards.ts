// Output guards: every text that comes from the LLM goes through here before it is shown.
// Rule (CLAUDE.md): no automatic reassurance, no diagnosis words, no irony.

/** Sentences containing one of these are removed. */
const FORBIDDEN: readonly RegExp[] = [
  /tu vas (y )?(r[ée]ussir|y arriver)/i,
  /ne t'?\s?inqui[eè]te/i,
  /t'?inqui[eè]te (pas|surtout pas)/i,
  /tout (ira|va aller) bien/i,
  /tout va bien/i,
  /tu exag[eè]res/i,
  /tu dramatises/i,
  /arr[eê]te de dramatiser/i,
  /ce n'?est rien/i,
  // Darija: "ne t'inquiète pas", "n'aie pas peur", "tout va bien se passer"
  /\bma\s?t(kh|5)af(ch|sh)\b/i,
  /\bma\s?t[q9k]l[ae]?[q9k](ch|sh)\b/i,
  /kolchi ghadi ydouz (mzyan|mezyan|bikhir)/i,
  /ما\s?تخافش/,
  /ما\s?تقلقش/,
  /كلشي غادي يدوز (مزيان|بخير)/,
];

/** Keys an LLM object may try to sneak in; they are dropped. */
const IRONY_KEYS = new Set(["ironie", "irony", "ironieLocale", "joke", "blague"]);

export function hasForbidden(text: unknown): boolean {
  return typeof text === "string" && FORBIDDEN.some((r) => r.test(text));
}

const SENTENCE = /[^.!?…\n]+[.!?…]*\s*/g;

export interface GuardResult {
  text: string;
  /** True when something was removed or replaced. */
  corrected: boolean;
}

/**
 * Removes every sentence that contains forbidden reassurance.
 * If nothing is left (or the text is empty), returns the fallback.
 */
export function guardText(text: unknown, fallback: string): GuardResult {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return { text: fallback, corrected: false };
  if (!hasForbidden(raw)) return { text: raw, corrected: false };
  const kept = (raw.match(SENTENCE) ?? []).filter((s) => !hasForbidden(s)).join("").trim();
  return { text: kept || fallback, corrected: true };
}

/**
 * Returns a copy of an LLM object with irony keys dropped and every string field guarded.
 * `fallbacks[field]` is used when a field ends up empty; fields without a fallback become "".
 */
export function guardObject<T extends Record<string, unknown>>(
  obj: T,
  fallbacks: Partial<Record<keyof T, string>> = {},
): { value: T; corrections: string[] } {
  const corrections: string[] = [];
  const entries = Object.entries(obj).flatMap(([key, v]): [string, unknown][] => {
    if (IRONY_KEYS.has(key)) {
      corrections.push(`ironie retirée (${key})`);
      return [];
    }
    if (typeof v !== "string") return [[key, v]];
    const fb = fallbacks[key as keyof T] ?? "";
    const g = guardText(v, fb);
    if (g.corrected) corrections.push(`réassurance retirée (${key})`);
    return [[key, g.text]];
  });
  return { value: Object.fromEntries(entries) as T, corrections };
}
