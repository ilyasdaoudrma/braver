// Cyclic sighing: a long inhale through the nose, a short second inhale to fill up, then a long, slow exhale
// through the mouth. The only claim we make (CLAUDE.md): "le soupir cyclique a amélioré l'humeur et ralenti la
// respiration (Stanford, 2023)". Never cortisol.

export type BreathPhase = "inspire" | "reinspire" | "expire";

export interface PhaseSpec {
  phase: BreathPhase;
  ms: number;
  label: string;
  /** Circle scale at the END of the phase (1 = rest). */
  scale: number;
}

export const CYCLE: readonly PhaseSpec[] = [
  { phase: "inspire", ms: 2500, label: "Inspire par le nez", scale: 1.35 },
  { phase: "reinspire", ms: 1000, label: "Encore un petit peu", scale: 1.5 },
  { phase: "expire", ms: 6000, label: "Expire lentement par la bouche", scale: 1 },
];

export const CYCLE_MS = CYCLE.reduce((s, p) => s + p.ms, 0);

export const DURATIONS = [
  { sec: 120, label: "2 minutes" },
  { sec: 300, label: "5 minutes" },
] as const;

export const BREATHING_CLAIM = "Le soupir cyclique a amélioré l'humeur et ralenti la respiration (Stanford, 2023).";

export interface BreathState {
  phase: PhaseSpec;
  /** Index of the phase in CYCLE. */
  index: number;
  /** 0–1 inside the current phase. */
  progress: number;
  cycle: number;
  done: boolean;
}

/** Where the exercise is after `elapsedMs`, for a session of `totalSec` seconds. */
export function breathAt(elapsedMs: number, totalSec: number): BreathState {
  const t = Math.max(0, elapsedMs);
  const done = t >= totalSec * 1000;
  const inCycle = t % CYCLE_MS;
  let acc = 0;
  for (let i = 0; i < CYCLE.length; i++) {
    const p = CYCLE[i];
    if (inCycle < acc + p.ms) {
      return { phase: p, index: i, progress: (inCycle - acc) / p.ms, cycle: Math.floor(t / CYCLE_MS), done };
    }
    acc += p.ms;
  }
  return { phase: CYCLE[0], index: 0, progress: 0, cycle: Math.floor(t / CYCLE_MS) + 1, done };
}
