// "Charger la démo de Yassine": 30 days of FICTIONAL data, every item marked `demo: true` and shown as "Exemple".
// Deterministic (no randomness) so the demo is the same on every phone. Never mixed with real numbers silently:
// loadDemo() keeps the person's own data and adds the demo items; clearDemo() removes only demo items.
import type {
  BreathingSession,
  Gad7Entry,
  Mood,
  MoodLevel,
  ReplayEntry,
  Worry,
  Zone,
} from "./types";
import type { Store } from "./store";
import { addDays } from "./replay";

const DAY = 86_400_000;

function at(now: Date, daysAgo: number, hour: number): string {
  const d = new Date(now.getTime() - daysAgo * DAY);
  d.setHours(hour, 15, 0, 0);
  // Never in the future: today's items land one hour before "now".
  return (
    d.getTime() > now.getTime() ? new Date(now.getTime() - 3_600_000) : d
  ).toISOString();
}

const MOOD_PATTERN: MoodLevel[] = [
  2, 2, 3, 2, 1, 2, 3, 3, 2, 3, 3, 4, 3, 2, 3, 3, 4, 3, 3, 4, 4, 3, 4, 3, 4, 4,
  3, 4, 5, 4,
];
const EMOTIONS = [
  ["stressé·e"],
  ["fatigué·e"],
  ["inquiet·e", "seul·e"],
  [],
  ["calme"],
  ["motivé·e"],
];

const WORRIES: { text: string; zone: Zone; step?: string; done?: boolean }[] = [
  {
    text: "Je vais rater le rattrapage d'analyse, j'en suis sûr.",
    zone: "scenario",
  },
  {
    text: "Mazal ma siftsh dossier dyal la bourse.",
    zone: "action",
    step: "Ouvre le mail et joins le dossier tel qu'il est.",
    done: true,
  },
  { text: "Bba khrjouh mn lkhedma.", zone: "acceptation" },
  { text: "Kolchi ghadi yd7ek 3liya f l'exposé.", zone: "scenario" },
  {
    text: "Je dois parler à mon coloc du bruit le soir.",
    zone: "action",
    step: "Écris-lui une phrase pour proposer d'en parler ce soir.",
    done: true,
  },
  {
    text: "Mon prof m'en veut, c'est pour ça que j'ai eu 9.",
    zone: "scenario",
  },
  {
    text: "خاصني نسلم الرابور ديال الستاج نهار الاثنين",
    zone: "action",
    step: "Ouvre le fichier et écris le titre de la première partie.",
    done: true,
  },
  { text: "Ma grand-mère est hospitalisée.", zone: "acceptation" },
  { text: "Ils vont pas me prendre au stage, c'est sûr.", zone: "scenario" },
  {
    text: "Je n'ai pas commencé à réviser la compta.",
    zone: "action",
    step: "Lis le sommaire du premier chapitre, 10 minutes.",
    done: true,
  },
  { text: "Ma tqbeltch f Erasmus.", zone: "acceptation" },
  { text: "Sa7bi ma rdch 3liya, akid za3fan mni.", zone: "scenario" },
  {
    text: "Il faut que je trouve une chambre plus près de la fac.",
    zone: "action",
    step: "Envoie un message au groupe d'annonces de la fac.",
  },
];

const REPLAYS: {
  prediction: string;
  certainty: number;
  worst: "oui" | "non" | "en_partie" | null;
  outcome?: string;
  daysAgo: number;
}[] = [
  {
    prediction: "Tu prédis que tu vas rater l'entretien.",
    certainty: 90,
    worst: "non",
    outcome: "J'ai bloqué sur une question mais ils m'ont rappelé.",
    daysAgo: 27,
  },
  {
    prediction: "Tu prédis que tout le monde va se moquer pendant l'exposé.",
    certainty: 85,
    worst: "non",
    outcome: "Deux questions, personne n'a ri.",
    daysAgo: 24,
  },
  {
    prediction: "Tu prédis que ton prof te déteste.",
    certainty: 70,
    worst: "non",
    outcome: "Il m'a expliqué la note, c'était la méthode.",
    daysAgo: 20,
  },
  {
    prediction: "Tu prédis un échec au partiel de droit.",
    certainty: 80,
    worst: "en_partie",
    outcome: "9,5 : pas validé, mais rattrapable.",
    daysAgo: 17,
  },
  {
    prediction: "Tu prédis que ta coloc t'en veut.",
    certainty: 60,
    worst: "non",
    outcome: "Elle était juste fatiguée.",
    daysAgo: 13,
  },
  {
    prediction: "Tu prédis que ton dossier sera refusé.",
    certainty: 75,
    worst: "oui",
    outcome: "Refusé, sans explication.",
    daysAgo: 10,
  },
  {
    prediction: "Tu prédis que ton ami est fâché.",
    certainty: 80,
    worst: "non",
    outcome: "Il n'avait plus de batterie.",
    daysAgo: 6,
  },
  {
    prediction: "Tu prédis que tu vas bloquer au rattrapage.",
    certainty: 85,
    worst: null,
    daysAgo: 2,
  },
  {
    prediction: "Tu prédis qu'ils ne vont pas te prendre au stage.",
    certainty: 70,
    worst: null,
    daysAgo: 0,
  },
];

const GAD7_SCORES = [14, 12, 11, 9];

export interface DemoData {
  moods: Mood[];
  worries: Worry[];
  replays: ReplayEntry[];
  breathing: BreathingSession[];
  gad7: Gad7Entry[];
}

/** Score s split into 7 answers (0–3) that add up to s. */
function answersFor(score: number): number[] {
  const base = Math.floor(score / 7);
  return Array.from({ length: 7 }, (_, i) =>
    Math.min(3, base + (i < score % 7 ? 1 : 0)),
  );
}

export function demoData(now: Date = new Date()): DemoData {
  const moods: Mood[] = MOOD_PATTERN.map((level, i) => ({
    id: `demo-mood-${i}`,
    at: at(now, 29 - i, 9 + (i % 3) * 5),
    level,
    emotions: EMOTIONS[i % EMOTIONS.length],
    demo: true,
  }));
  const worries: Worry[] = WORRIES.map((w, i) => {
    const daysAgo = 28 - i * 2;
    return {
      id: `demo-worry-${i}`,
      text: w.text,
      zone: w.zone,
      createdAt: at(now, daysAgo, 21),
      source: "llm",
      model: "openai/gpt-oss-20b",
      movedFrom: null,
      step: w.step ?? null,
      fearBefore: w.done ? 7 - (i % 3) : null,
      doneAt: w.done ? at(now, daysAgo - 1, 18) : null,
      demo: true,
    };
  });
  const replays: ReplayEntry[] = REPLAYS.map((r, i) => {
    const created = new Date(now.getTime() - r.daysAgo * DAY);
    return {
      id: `demo-replay-${i}`,
      worryId: null,
      text: r.prediction
        .replace("Tu prédis que tu vas", "Je vais")
        .replace("Tu prédis que", "")
        .trim(),
      prediction: r.prediction,
      question: null,
      certainty: r.certainty,
      checkAt: addDays(created, r.worst ? 1 : 3),
      createdAt: created.toISOString(),
      status: r.worst ? "done" : "pending",
      outcome: r.outcome ?? null,
      worstHappened: r.worst,
      comment: null,
      commentSource: null,
      demo: true,
    };
  });
  const breathing: BreathingSession[] = [27, 23, 20, 16, 13, 9, 6, 3, 1].map(
    (daysAgo, i) => ({
      id: `demo-breath-${i}`,
      at: at(now, daysAgo, 22),
      durationSec: i % 3 === 0 ? 300 : 120,
      moodBefore: ([2, 2, 3, 2, 3, 3, 3, 4, 3] as MoodLevel[])[i],
      moodAfter: ([3, 3, 3, 3, 4, 4, 4, 4, 4] as MoodLevel[])[i],
      demo: true,
    }),
  );
  const gad7: Gad7Entry[] = GAD7_SCORES.map((score, i) => ({
    id: `demo-gad7-${i}`,
    at: at(now, 28 - i * 7, 20),
    answers: answersFor(score),
    score,
    demo: true,
  }));
  return { moods, worries, replays, breathing, gad7 };
}

const KEYS = ["moods", "worries", "replays", "breathing", "gad7"] as const;

export function loadDemo(target: Store, now: Date = new Date()): void {
  const data = demoData(now);
  for (const key of KEYS) {
    target.update(
      key,
      (list) =>
        [
          ...(list as { demo?: boolean }[]).filter((x) => !x.demo),
          ...data[key],
        ] as never,
    );
  }
  target.update("settings", (s) => ({ ...s, demo: true }));
}

export function clearDemo(target: Store): void {
  for (const key of KEYS)
    target.update(
      key,
      (list) => (list as { demo?: boolean }[]).filter((x) => !x.demo) as never,
    );
  target.update("settings", (s) => ({ ...s, demo: false }));
}
