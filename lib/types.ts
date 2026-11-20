// Shared data model of BRAVER. Shared file: change it in a small "shared:" PR.
// Rule: add new optional fields or new store keys; never rename an existing field or key.

export type Zone = "scenario" | "action" | "acceptation";
export const ZONES: readonly Zone[] = ["scenario", "action", "acceptation"] as const;

/** Language / script of a text, as used in datasets and metrics. */
export type Lang = "fr" | "darija_latn" | "darija_arab" | "en" | "ar" | "other";

/** "Doux" = gentle, "Direct" = shorter sentences. There is no irony mode. */
export type Tone = "doux" | "direct";

/** Where a sort result comes from: the on-device models, or the LLM on Groq. */
export type SortSource = "device" | "llm";

/** Where the data lives: "device" = localStorage (consent given), "session" = sessionStorage, null = not asked yet. */
export type Consent = "device" | "session" | null;

/** One sorted card, as shown on the Tri screen. Zone-specific fields are null when they do not apply. */
export interface SortResult {
  text: string;
  zone: Zone;
  why: string;
  source: SortSource;
  /** Groq model id when source = "llm", e.g. "openai/gpt-oss-20b". */
  model: string | null;
  /** Time the person waited for this result, in ms. */
  ms: number | null;
  /** scenario: the prediction to check later, and the question to ask then. */
  prediction: string | null;
  question: string | null;
  /** action: one step under 15 minutes. */
  step: string | null;
  /** acceptation: acknowledge, then one thing still in control. */
  validation: string | null;
  control: string | null;
}

/** A worry the person wrote, after sorting. */
export interface Worry {
  id: string;
  text: string;
  zone: Zone;
  createdAt: string; // ISO
  source: SortSource;
  model: string | null;
  /** The person moved the card to another zone ("Pas la bonne zone ?"). */
  movedFrom: Zone | null;
  /** action card */
  step: string | null;
  fearBefore: number | null; // 0–10
  doneAt: string | null; // ISO
  demo?: boolean;
}

export type WorstHappened = "oui" | "non" | "en_partie";

/** A scenario prediction, checked later against what really happened. */
export interface ReplayEntry {
  id: string;
  worryId: string | null;
  text: string;
  prediction: string;
  question: string | null;
  certainty: number; // 0–100
  checkAt: string; // ISO date (YYYY-MM-DD) when to ask what happened
  createdAt: string; // ISO
  status: "pending" | "done";
  outcome: string | null; // what really happened, in the person's words
  worstHappened: WorstHappened | null;
  comment: string | null; // short LLM or local comment
  commentSource: SortSource | null;
  demo?: boolean;
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface Mood {
  id: string;
  at: string; // ISO
  level: MoodLevel;
  emotions: string[];
  demo?: boolean;
}

/** GAD-7: 7 answers from 0 to 3, score 0–21. Never stored or shown with a diagnosis label. */
export interface Gad7Entry {
  id: string;
  at: string; // ISO
  answers: number[];
  score: number;
  demo?: boolean;
}

export interface BreathingSession {
  id: string;
  at: string; // ISO
  durationSec: number;
  moodBefore: MoodLevel | null;
  moodAfter: MoodLevel | null;
  demo?: boolean;
}

/** I3 memory: one embedding per worry, kept on the device. */
export interface EmbeddingEntry {
  worryId: string;
  model: string;
  vector: number[];
}

export interface Settings {
  consent: Consent;
  tone: Tone;
  /** Never call Groq (demo of the on-device mode). */
  forceLocal: boolean;
  /** Demo data loaded ("Charger la démo de Yassine"). */
  demo: boolean;
  /** I3: remember similar worries with on-device embeddings (downloads a ~118 MB model once). Off by default. */
  memory: boolean;
}
