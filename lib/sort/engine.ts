// Sort engine in the browser. Order (CLAUDE.md): on-device safety first, then on-device zones (instant),
// then the LLM upgrades the cards. No network → the on-device result stays.
import type { SortResult, Tone } from "../types";
import { checkSafety, type SafetyLevel } from "../safety/pipeline";
import { getSafetyModel } from "../safety/model";
import { similarity } from "../text";
import {
  type ApiSortItem,
  type ApiSortResponse,
  MAX_CHARS,
  MAX_LINES,
} from "./api";
import { deviceZone, fillFields } from "./rules";

export interface SortOptions {
  tone: Tone;
  confirmedSafe: boolean;
  /** Never call the network (on-device demo mode). */
  forceLocal: boolean;
}

export interface SortCard extends SortResult {
  /** Index of the line in the person's text. */
  index: number;
  /** Times a similar worry was already written. */
  seen: number;
  /** Hopelessness without explicit danger → gentle check-in with the help button. */
  distress: boolean;
  /** Ambiguous wording ("me tuer"): waiting for the LLM; if it never answers, this becomes an alert. */
  checking: boolean;
}

export type AlertSource = "keywords" | "llm" | "offline_doubt";

export interface SortOutcome {
  /** Non-null → show the safety screen, no cards. */
  alert: { source: AlertSource; lines: string[] } | null;
  cards: SortCard[];
  /** Who produced the cards shown now. */
  engine: "device" | "llm";
  model: string | null;
  ms: number | null;
  /** Why the LLM did not answer (set when engine stays "device" after trying). */
  failure: string | null;
}

/** One worry per line, trimmed, empty lines removed, at most 12 lines of 500 characters. */
export function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map((l) => l.slice(0, MAX_CHARS));
}

/** How many earlier worries look like this one (history + earlier lines of the same sort). */
export function seenCount(text: string, history: readonly string[]): number {
  return history.filter((h) => similarity(text, h) >= 0.5).length;
}

function deviceCard(
  text: string,
  index: number,
  seen: number,
  level: SafetyLevel,
): SortCard {
  const { zone } = deviceZone(text);
  return {
    text,
    index,
    seen,
    zone,
    ...fillFields(text, zone, seen > 0),
    source: "device",
    model: null,
    ms: null,
    distress: level === "hopeless",
    checking: level === "check",
  };
}

/** Instant, offline: safety (keywords + trained model) then on-device zones. */
export function sortOnDevice(
  lines: readonly string[],
  opts: Pick<SortOptions, "confirmedSafe">,
  history: readonly string[] = [],
): SortOutcome {
  const model = getSafetyModel();
  const checks = lines.map((text) => ({
    text,
    level: checkSafety(text, model).level,
  }));
  const danger = checks.filter((c) => c.level === "danger");
  if (danger.length && !opts.confirmedSafe) {
    return {
      alert: { source: "keywords", lines: danger.map((d) => d.text) },
      cards: [],
      engine: "device",
      model: null,
      ms: null,
      failure: null,
    };
  }
  const cards = checks.map((c, i) => {
    // After "On s'est mal compris", an on-device danger is treated as a doubt: the LLM decides.
    const level: SafetyLevel = c.level === "danger" ? "check" : c.level;
    const card = deviceCard(
      c.text,
      i,
      seenCount(c.text, [...history, ...lines.slice(0, i)]),
      level,
    );
    // Offline or forced local after "On s'est mal compris", nothing can resolve that doubt: the card always
    // keeps the gentle check-in with the help button, so help stays one tap away.
    return c.level === "danger" ? { ...card, distress: true } : card;
  });
  return {
    alert: null,
    cards,
    engine: "device",
    model: null,
    ms: null,
    failure: null,
  };
}

/** Applies the LLM answer on top of the on-device cards. Missing lines keep their on-device card. */
export function mergeLLM(
  device: SortOutcome,
  res: Extract<ApiSortResponse, { ok: true }>,
  clientMs: number,
  confirmedSafe = false,
): SortOutcome {
  if (device.alert) return device;
  const byN = new Map<number, ApiSortItem>(res.items.map((it) => [it.n, it]));
  const flagged = device.cards.filter((c) => byN.get(c.index + 1)?.danger);
  if (flagged.length) {
    return {
      ...device,
      alert: { source: "llm", lines: flagged.map((c) => c.text) },
      cards: [],
      engine: "llm",
      model: res.model,
      ms: clientMs,
    };
  }
  // A doubt the LLM did not answer for is still unresolved: safety first.
  const unresolved = device.cards.filter(
    (c) => c.checking && !byN.has(c.index + 1),
  );
  if (unresolved.length && !confirmedSafe) {
    return {
      ...device,
      alert: { source: "offline_doubt", lines: unresolved.map((c) => c.text) },
      cards: [],
      failure: "missing_line",
    };
  }
  const cards = device.cards.map((c): SortCard => {
    const it = byN.get(c.index + 1);
    if (!it) return { ...c, checking: false };
    return {
      ...c,
      zone: it.zone,
      why: it.why,
      prediction: it.prediction,
      question: it.question,
      step: it.step,
      validation: it.validation,
      control: it.control,
      source: "llm",
      model: res.model,
      ms: clientMs,
      distress: c.distress || it.distress,
      checking: false,
    };
  });
  return {
    alert: null,
    cards,
    engine: "llm",
    model: res.model,
    ms: clientMs,
    failure: null,
  };
}

/** The LLM did not answer: keep the on-device cards, but an unresolved doubt becomes an alert (safety first). */
export function onLLMFailure(
  device: SortOutcome,
  failure: string,
  opts: Pick<SortOptions, "confirmedSafe">,
): SortOutcome {
  if (device.alert) return device;
  const doubts = device.cards.filter((c) => c.checking);
  if (doubts.length && !opts.confirmedSafe) {
    return {
      ...device,
      alert: { source: "offline_doubt", lines: doubts.map((c) => c.text) },
      cards: [],
      failure,
    };
  }
  return {
    ...device,
    cards: device.cards.map((c) => ({ ...c, checking: false })),
    failure,
  };
}

export const CLIENT_TIMEOUT_MS = 20_000;

/** Calls /api/sort. Never throws: network errors become { ok: false }. */
export async function requestSort(
  cards: readonly SortCard[],
  opts: SortOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiSortResponse | { ok: false; error: "network" | "timeout" }> {
  try {
    const res = await fetchImpl("/api/sort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worries: cards.map((c) => ({ text: c.text, seen: c.seen })),
        tone: opts.tone,
        confirmedSafe: opts.confirmedSafe,
      }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    return (await res.json()) as ApiSortResponse;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof DOMException && err.name === "TimeoutError"
          ? "timeout"
          : "network",
    };
  }
}

/** Full sort: returns the on-device outcome right away through `onUpdate`, then the upgraded one. */
export async function runSort(
  lines: readonly string[],
  opts: SortOptions,
  history: readonly string[],
  onUpdate: (outcome: SortOutcome, final: boolean) => void,
  fetchImpl: typeof fetch = fetch,
): Promise<SortOutcome> {
  const device = sortOnDevice(lines, opts, history);
  if (device.alert || device.cards.length === 0) {
    onUpdate(device, true);
    return device;
  }
  if (opts.forceLocal) {
    // No LLM by choice: same rule as offline, an ambiguous line becomes an alert.
    const local = onLLMFailure(device, "forced_local", opts);
    onUpdate({ ...local, failure: null }, true);
    return { ...local, failure: null };
  }
  onUpdate(device, false);
  const started = performance.now();
  const res = await requestSort(device.cards, opts, fetchImpl);
  const final = res.ok
    ? mergeLLM(
        device,
        res,
        Math.round(performance.now() - started),
        opts.confirmedSafe,
      )
    : onLLMFailure(device, res.error, opts);
  onUpdate(final, true);
  return final;
}
