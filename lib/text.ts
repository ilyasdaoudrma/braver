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

const STOP = new Set(
  "je j me m te t tu il elle on nous vous ils elles le la les l un une des de du d a au aux et ou mais si que qu qui ce c ca cest est suis es sont va vais vont pas ne n plus mon ma mes ton ta tes son sa ses pour par sur dans avec en y deja encore trop tres fois ana nta nti dyal f fi mn w o ou ghadi ma chi".split(
    " ",
  ),
);

/** Content words of a text (normalised, no stop words, > 2 letters). */
export function tokens(text: string): string[] {
  return normalize(text)
    .trim()
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Jaccard similarity of the content words of two texts, 0–1. */
export function similarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
