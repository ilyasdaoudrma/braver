"use client";
// The current sort, kept in memory while the person moves between Vider, Tri and Sécurité.
// When the sort is final, its worries are saved on the device (store key "worries").
import { useSyncExternalStore } from "react";
import { store, uid } from "../store";
import type { Worry } from "../types";
import { runSort, type SortOptions, type SortOutcome } from "./engine";

export interface SortSession {
  id: string;
  lines: string[];
  outcome: SortOutcome;
  /** True while the LLM upgrade is in flight. */
  upgrading: boolean;
  startedAt: string;
  /** The safety screen has been shown for this session's alert. */
  alertSeen: boolean;
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
    id: uid(),
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
  let first: SortOutcome | null = null;
  void runSort(lines, opts, history, (outcome, final) => {
    if (id !== activeId) return; // replaced by a newer sort, or cleared
    first ??= outcome;
    const session: SortSession = { id, lines: [...lines], outcome, upgrading: !final, startedAt, alertSeen: false };
    publish(session);
    if (final) saveWorries(session);
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
