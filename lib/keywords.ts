// On-device safety keywords. They run BEFORE any network call and before the trained model (M1).
// Ported from legacy/js/data.js, plus "ne plus vouloir se réveiller" variants and a hopelessness list.
// Levels:
//  - danger:   stop now, show the safety screen (suicidal ideas, self-harm, violence suffered, immediate danger)
//  - hopeless: no alert, but a gentle check-in card with the help button
//  - doubt:    words often used figuratively ("ce partiel va me tuer"): the model / LLM decides; offline → alert
import { findAny, normalize, prep } from "./text";

export type KeywordLevel = "danger" | "hopeless" | "doubt" | "none";

export interface KeywordResult {
  level: KeywordLevel;
  /** The (normalised) keyword or pattern name that matched, null when level = "none". */
  match: string | null;
}

const DANGER_WORDS = [
  // Français
  "suicide", "suicider", "mettre fin a mes jours", "envie de mourir", "veux mourir", "voudrais mourir",
  "plus envie de vivre", "plus la force de vivre", "veux me tuer", "vais me tuer", "me faire du mal",
  "me couper", "me scarifier", "scarifie", "me frappe", "me frappent", "me bat ", "me battent", "m a frappe",
  "je suis en danger", "m agresse", "abuse de moi", "disparaitre pour toujours", "me reveillais plus",
  "me reveiller plus", "plus me reveiller", "mieux sans moi", "plus simple sans moi", "plus simple pour tout le monde",
  "me jeter", "sauter du pont", "sauter par la fenetre",
  // Darija, lettres latines
  "bghit nmout", "bghit nmot", "baghi nmout", "baghya nmout", "ma bqitch bghit n3ich", "ma bqitch baghi n3ich",
  "ma bghitch n3ich", "ndir chi 7aja f rassi", "ndir chi 7aja f rasi", "nlo7 rasi", "nlou7 rassi",
  "kayderbni", "kaydrebni", "kidrebni", "kaydarbni", "kayderbouni", "drebni", "derbni", "nentaher", "nnte7er", "ntte7er",
  // Darija et arabe, lettres arabes
  "انتحار", "ننتحر", "انتحر", "بغيت نموت", "بقيتش بغيت نعيش", "بقيتش باغي نعيش", "ما بغيتش نعيش", "نقتل راسي",
  "كيضربني", "كيضربوني", "ضربني", "ندير شي حاجة فراسي", "ندير شي حاجة في راسي", "نلوح راسي", "نرمي راسي",
  "ما بقيتش باغي نفيق", "ما بغيتش نفيق",
];

/** Darija spelling variants (q/9/k, vowels), applied to the normalised text. */
const DANGER_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "nqtel rasi", re: /\bn[q9k]t[ae]?l\s?ra[s]{1,2}i\b/ },
  { name: "ma bqit baghi n3ich", re: /\bb[q9k]it(ch)?\s(bghit|baghi|baghya|bghina)\sn3[iy]ch\b/ },
  { name: "ma bghitch n3ich", re: /\bma\s?bghit(ch)?\sn3[iy]ch\b/ },
  { name: "ma bqit baghi nfi9", re: /\bb[q9k]it(ch)?\s(bghit|baghi|baghya)\snf[iy]{1,2}[q9k]\b/ },
  { name: "ma bghitch nfi9", re: /\bma\s?bghit(ch)?\snf[iy]{1,2}[q9k]\b/ },
  { name: "kaydrebni", re: /\b(kay|ki|ka)?d[ae]?r[ae]?b(ou|o)?n[iy]\b/ },
];

const HOPELESS_WORDS = [
  // Français
  "je ne vaux rien", "je vaux rien", "je sers a rien", "je ne sers a rien", "plus aucun espoir", "aucun espoir",
  "rien ne changera jamais", "ca ne sert a rien de vivre", "je suis un poids", "je suis un fardeau",
  // Darija, lettres latines
  "ma bqitch nchouf l9ima", "mab9itch nchouf l9ima", "l9ima dyal rasi", "lqima dyal rasi", "ma 3ndi 7ta qima",
  "ma 3endi 7ta 9ima", "ma kayn 7ta amal",
  // Darija et arabe, lettres arabes
  "القيمة ديال راسي", "ما عندي حتى قيمة", "ما بقى عندي امل", "ما كاين حتى امل",
];

const HOPELESS_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "nchouf l9ima", re: /\bnchou?f\s?l[q9k]ima\b/ },
];

const DOUBT_WORDS = [
  "me tuer", "en finir", "mourir", "crever", "nmout", "nmot", "نموت", "يقتلني", "يقتلوني", "ghadi yqtelni", "ghadi y9telni",
];

const DANGER = prep(DANGER_WORDS);
const HOPELESS = prep(HOPELESS_WORDS);
const DOUBT = prep(DOUBT_WORDS);

function matchPatterns(norm: string, patterns: readonly { name: string; re: RegExp }[]): string | null {
  return patterns.find((p) => p.re.test(norm))?.name ?? null;
}

/** Keyword check on one worry. Highest level wins: danger > hopeless > doubt > none. */
export function checkKeywords(text: string): KeywordResult {
  const norm = normalize(text);
  const danger = findAny(norm, DANGER) ?? matchPatterns(norm, DANGER_PATTERNS);
  if (danger) return { level: "danger", match: danger.trim() };
  const hopeless = findAny(norm, HOPELESS) ?? matchPatterns(norm, HOPELESS_PATTERNS);
  if (hopeless) return { level: "hopeless", match: hopeless.trim() };
  const doubt = findAny(norm, DOUBT);
  if (doubt) return { level: "doubt", match: doubt.trim() };
  return { level: "none", match: null };
}
