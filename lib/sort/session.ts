"use client";
// The current sort, kept in memory while the person moves between Vider, Tri and Sécurité.
// When the sort is final, its worries are saved on the device (store key "worries").
import { useSyncExternalStore } from "react";
import { store, uid } from "../store";
import type { Worry, Zone } from "../types";
import { runSort, type SortOptions, type SortOutcome } from "./engine";
import { fillFields } from "./rules";

export interface SortSession {
  id: string;
  lines: string[];
  outcome: SortOutcome;
  /** True while the LLM upgrade is in flight. */
  upgrading: boolean;
  startedAt: string;
  /** The safety screen has been shown for this session's alert. */
  alertSeen: boolean;
  /** Options the sort ran with (used to re-run it after "On s'est mal compris"). */
  opts: SortOptions;
  /** Store id of the worry saved for each line (same order as `lines`). */
  worryIds: string[];
  /** True once the worries are saved on the device (cards can then be moved / marked done). */
  saved: boolean;
}

let current: SortSession | null = null;
/** Only the most recent sort may publish; clearSort() sets it to null so late answers are dropped. */
let activeId: string | null = null;
const saved = new Set<string>();
const listeners = new Set<() => void>();

function publish(next: SortSession | null): void {
  current = next;
  listeners.forEach((l) => l());
}

function saveWorries(session: SortSession): void {
  if (saved.has(session.id) || session.outcome.alert || session.outcome.cards.length === 0) return;
  saved.add(session.id);
  const worries: Worry[] = session.outcome.cards.map((c) => ({
    id: session.worryIds[c.index],
    text: c.text,
    zone: c.zone,
    createdAt: session.startedAt,
    source: c.source,
    model: c.model,
    movedFrom: null,
    step: c.step,
    fearBefore: null,
    doneAt: null,
  }));
  store.update("worries", (w) => [...w, ...worries]);
}

/** True while a sort is waiting for the LLM (used to ignore double submits). */
export function isSorting(): boolean {
  return Boolean(current?.upgrading);
}

/**
 * Starts a sort and returns the on-device outcome synchronously (alert or cards),
 * so the caller can navigate at once. The LLM upgrade continues in the background.
 */
export function startSort(lines: readonly string[], opts: SortOptions): SortOutcome {
  const id = uid();
  activeId = id;
  const history = store.get("worries").map((w) => w.text);
  const startedAt = new Date().toISOString();
  const worryIds = lines.map(() => uid());
  let first: SortOutcome | null = null;
  void runSort(lines, opts, history, (outcome, final) => {
    if (id !== activeId) return; // replaced by a newer sort, or cleared
    first ??= outcome;
    const session: SortSession = {
      id, lines: [...lines], outcome, upgrading: !final, startedAt, alertSeen: false, opts, worryIds, saved: false,
    };
    if (final) saveWorries(session);
    publish({ ...session, saved: saved.has(id) });
  });
  // runSort calls onUpdate synchronously with the on-device result before its first await.
  return first ?? sortFallback();
}

function sortFallback(): SortOutcome {
  return current?.outcome ?? { alert: null, cards: [], engine: "device", model: null, ms: null, failure: null };
}

/** Called by the safety screen once it is visible. */
export function acknowledgeAlert(): void {
  if (current?.outcome.alert && !current.alertSeen) publish({ ...current, alertSeen: true });
}

/**
 * "On s'est mal compris" on the safety screen: re-run the same lines with confirmedSafe.
 * Keywords no longer stop the sort; ambiguous lines still go to the LLM. Returns false when there is nothing to re-run.
 */
export function resortConfirmed(): boolean {
  if (!current?.outcome.alert) return false;
  startSort(current.lines, { ...current.opts, confirmedSafe: true });
  return true;
}

/** "Pas la bonne zone ?": move one card, keep the person's choice in the saved worry. */
export function moveCard(index: number, zone: Zone): void {
  if (!current?.saved) return;
  const card = current.outcome.cards.find((c) => c.index === index);
  if (!card || card.zone === zone) return;
  const from = card.zone;
  const cards = current.outcome.cards.map((c) =>
    c.index === index ? { ...c, zone, ...fillFields(c.text, zone, c.seen > 0), source: "device" as const, model: null, ms: null } : c,
  );
  publish({ ...current, outcome: { ...current.outcome, cards } });
  const worryId = current.worryIds[index];
  const step = cards.find((c) => c.index === index)?.step ?? null;
  store.update("worries", (ws) => ws.map((w) => (w.id === worryId ? { ...w, zone, movedFrom: w.movedFrom ?? from, step } : w)));
}

export function clearSort(): void {
  activeId = null;
  publish(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSortSession(): SortSession | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
