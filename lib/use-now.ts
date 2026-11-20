"use client";
import { useSyncExternalStore } from "react";

// Current time for client components, refreshed every minute. null on the server and during hydration, so
// pages never read the clock while being prerendered (Next.js cacheComponents) — show the loading state instead.
const TICK_MS = 60_000;
let snapshot: number | null = null;

function read(): number {
  snapshot ??= Date.now();
  return snapshot;
}

function subscribe(onChange: () => void): () => void {
  const t = window.setInterval(() => {
    snapshot = Date.now();
    onChange();
  }, TICK_MS);
  return () => window.clearInterval(t);
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
