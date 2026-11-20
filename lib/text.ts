// Text normalisation for French, Darija in Latin letters (3, 7, 9…) and Arabic script.
// Ported from legacy/js/text.js. M1 must keep the Python normalisation identical to this one.

const LATIN_DIACRITICS = /[̀-ͯ]/g;
const ARABIC_MARKS = /[ً-ْٰـ]/g; // harakat, dagger alif, tatweel

/** Lowercase, strip accents and Arabic diacritics, unify Arabic letter variants, keep letters/digits only. Result has one leading and trailing space. */
export function normalize(input: unknown): string {
  let s = String(input ?? "").toLowerCase();
  s = s.normalize("NFD").replace(LATIN_DIACRITICS, "");
  s = s
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
  s = s.replace(/[’`´]/g, "'");
  s = s.replace(/[^a-z0-9ء-ي\s]/g, " ");
  return ` ${s.replace(/\s+/g, " ").trim()} `;
}

export function compact(norm: string): string {
  return norm.replace(/\s+/g, "");
}

const HAS_ARABIC = /[ء-ي]/;

/** True if the normalised text contains one of the (pre-normalised) patterns. Multi-word Arabic patterns also match without spaces. */
export function hasAny(norm: string, patterns: readonly string[]): boolean {
  const flat = compact(norm);
  return patterns.some(
    (p) => norm.includes(p) || (p.trim().includes(" ") && HAS_ARABIC.test(p) && flat.includes(compact(p))),
  );
}

/** First pattern found, or null. */
export function findAny(norm: string, patterns: readonly string[]): string | null {
  return patterns.find((p) => hasAny(norm, [p])) ?? null;
}

/** Normalise a keyword list once. Short words (≤ 4 chars) keep their edge spaces to avoid matching inside other words. */
export function prep(patterns: readonly string[]): string[] {
  return patterns.map((p) => {
    const n = normalize(p);
    return p.trim().length <= 4 ? n : n.trim();
  });
}

export function isArabic(s: unknown): boolean {
  return /[؀-ۿ]/.test(String(s ?? ""));
}
