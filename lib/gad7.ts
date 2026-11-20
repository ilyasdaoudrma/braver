// GAD-7 (Spitzer et al., 2006), French wording in tutoiement. Score and trend only: never a label,
// never a diagnosis (CLAUDE.md). Score ≥ 15 → a calm suggestion to talk to a professional.

export const GAD7_INTRO = "Ces deux dernières semaines, à quelle fréquence as-tu été gêné·e par…";

export const GAD7_QUESTIONS = [
  "un sentiment de nervosité, d'anxiété ou de tension ?",
  "le fait de ne pas arriver à arrêter de t'inquiéter, ou à contrôler tes inquiétudes ?",
  "des inquiétudes excessives à propos de tout et de rien ?",
  "du mal à te détendre ?",
  "une agitation telle qu'il est difficile de tenir en place ?",
  "le fait de devenir facilement contrarié·e ou irritable ?",
  "la peur que quelque chose de terrible puisse arriver ?",
] as const;

export const GAD7_ANSWERS = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Plusieurs jours" },
  { value: 2, label: "Plus de la moitié des jours" },
  { value: 3, label: "Presque tous les jours" },
] as const;

export const GAD7_SUGGEST_FROM = 15;

/** Sum of 7 answers (0–3 each). Throws on an incomplete or invalid set. */
export function gad7Score(answers: readonly number[]): number {
  if (answers.length !== GAD7_QUESTIONS.length || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) {
    throw new Error("GAD-7 needs 7 answers between 0 and 3");
  }
  return answers.reduce((s, a) => s + a, 0);
}

/** Change since the previous score, as plain words (no label). */
export function trendText(scores: readonly number[]): string | null {
  if (scores.length < 2) return null;
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  if (last === prev) return `Même score que la dernière fois (${last}).`;
  return last < prev ? `${prev - last} point${prev - last > 1 ? "s" : ""} de moins que la dernière fois.` : `${last - prev} point${last - prev > 1 ? "s" : ""} de plus que la dernière fois.`;
}
