// Suivi (dashboard): everything is computed from the person's own data on the device, for 24 h / 7 j / 30 j.
// No streaks, no score, no label: only counts and trends.
import { calibration, type Calibration } from "./replay";
import type { StoreData } from "./store";
import type { MoodLevel, Zone } from "./types";

export type Period = "24h" | "7j" | "30j";
export const PERIODS: { id: Period; label: string; ms: number }[] = [
  { id: "24h", label: "24 h", ms: 86_400_000 },
  { id: "7j", label: "7 jours", ms: 7 * 86_400_000 },
  { id: "30j", label: "30 jours", ms: 30 * 86_400_000 },
];

export interface MoodPoint {
  at: string;
  level: MoodLevel;
}

export interface Dashboard {
  moods: MoodPoint[];
  moodMean: number | null;
  zones: Record<Zone, number>;
  worries: number;
  stepsDone: number;
  actions: number;
  calibration: Calibration;
  breathing: {
    sessions: number;
    minutes: number;
    better: number;
    rated: number;
  };
  gad7: { at: string; score: number }[];
  /** Some of the data shown is the fictional demo. */
  hasDemo: boolean;
}

type Data = Pick<
  StoreData,
  "moods" | "worries" | "replays" | "breathing" | "gad7"
>;

export function inPeriod(
  iso: string | null | undefined,
  period: Period,
  now: Date = new Date(),
): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  const span = PERIODS.find((p) => p.id === period)?.ms ?? 0;
  // Small tolerance: the screen clock (useNow) is refreshed once a minute, an entry saved since must still count.
  return Number.isFinite(t) && t <= now.getTime() + 120_000 && t > now.getTime() - span;
}

export function dashboard(
  data: Data,
  period: Period,
  now: Date = new Date(),
): Dashboard {
  const within = <T>(
    list: readonly T[],
    date: (x: T) => string | null | undefined,
  ) => list.filter((x) => inPeriod(date(x), period, now));
  const moods = within(data.moods, (m) => m.at).sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const worries = within(data.worries, (w) => w.createdAt);
  const zones: Record<Zone, number> = {
    scenario: 0,
    action: 0,
    acceptation: 0,
  };
  worries.forEach((w) => (zones[w.zone] += 1));
  const replaysChecked = data.replays.filter(
    (r) => r.status === "done" && inPeriod(r.createdAt, period, now),
  );
  const breathing = within(data.breathing, (b) => b.at);
  const rated = breathing.filter(
    (b) => b.moodBefore !== null && b.moodAfter !== null,
  );
  // GAD-7 trend: always the last entries in the period (weekly questionnaire), oldest first.
  const gad7 = within(data.gad7, (g) => g.at).sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const stepsDone = data.worries.filter((w) => inPeriod(w.doneAt, period, now));
  const all = [
    ...moods,
    ...worries,
    ...stepsDone,
    ...replaysChecked,
    ...breathing,
    ...gad7,
  ] as { demo?: boolean }[];
  return {
    moods: moods.map((m) => ({ at: m.at, level: m.level })),
    moodMean: moods.length
      ? moods.reduce((s, m) => s + m.level, 0) / moods.length
      : null,
    zones,
    worries: worries.length,
    actions: zones.action,
    stepsDone: stepsDone.length,
    calibration: calibration(replaysChecked),
    breathing: {
      sessions: breathing.length,
      minutes: Math.floor(
        breathing.reduce((s, b) => s + b.durationSec, 0) / 60,
      ),
      better: rated.filter((b) => (b.moodAfter ?? 0) > (b.moodBefore ?? 0))
        .length,
      rated: rated.length,
    },
    gad7: gad7.map((g) => ({ at: g.at, score: g.score })),
    hasDemo: all.some((x) => x.demo),
  };
}
