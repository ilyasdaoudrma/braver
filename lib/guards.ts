// Output guards: every text that comes from the LLM goes through here before it is shown.
// Rule (CLAUDE.md): no automatic reassurance, no diagnosis words, no irony.

/** Sentences containing one of these are removed. Text is tested after apostrophes are unified to "'". */
const FORBIDDEN: readonly RegExp[] = [
  /tu vas (y )?(r[ée]ussir|y arriver)/i,
  /ne t'?\s?inqui[eè]te/i,
  /t'?inqui[eè]te (pas|surtout pas)/i,
  /(^|[.!?…,;]\s*)t'\s?inqui[eè]te\b/i, // "T'inquiète, …" at the start of a sentence (not "ce qui t'inquiète")
  /tout (ira|va aller) bien/i,
  /tout va bien/i,
  /[çc]a va aller/i,
  /pas de panique/i,
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

const unifyQuotes = (s: string): string => s.replace(/[’‘`´]/g, "'");

export function hasForbidden(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const t = unifyQuotes(text);
  return FORBIDDEN.some((r) => r.test(t));
}

/** Sentence = text up to . ! ? … or Arabic ؟ ۔ (inclusive), or a line break. */
const SENTENCE = /[^.!?…؟۔\n]+[.!?…؟۔]*\s*/g;

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

function guardValue(value: unknown, fallback: string, path: string, corrections: string[]): unknown {
  if (typeof value === "string") {
    const g = guardText(value, fallback);
    if (g.corrected) corrections.push(`réassurance retirée (${path})`);
    return g.text;
  }
  if (Array.isArray(value)) {
    return value
      .map((v, i) => guardValue(v, "", `${path}[${i}]`, corrections))
      .filter((v) => v !== "");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).flatMap(([k, v]): [string, unknown][] => {
      if (IRONY_KEYS.has(k)) {
        corrections.push(`ironie retirée (${path ? `${path}.` : ""}${k})`);
        return [];
      }
      return [[k, guardValue(v, "", path ? `${path}.${k}` : k, corrections)]];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

/**
 * Returns a copy of an LLM object with irony keys dropped and every string guarded, at any depth.
 * Top-level `fallbacks[field]` is used when a field ends up empty; other strings become "" (and are removed from arrays).
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
    return [[key, guardValue(v, fallbacks[key as keyof T] ?? "", key, corrections)]];
  });
  return { value: Object.fromEntries(entries) as T, corrections };
}
