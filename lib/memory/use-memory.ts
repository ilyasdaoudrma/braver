"use client";
// I3 glue: index saved worries (embeddings on the device) and compute the memory line of each card.
import { useEffect, useState } from "react";
import { store } from "../store";
import type { EmbeddingEntry } from "../types";
import { useStoreValue } from "../use-store";
import { EMBED_MODEL, embed } from "./embed";
import { memoryLine, similarWorries, summarize } from "./memory";

/** Embeds every own worry that has no vector yet. Resolves false if the model cannot load. */
export async function indexWorries(): Promise<boolean> {
  const have = new Set(store.get("embeddings").filter((e) => e.model === EMBED_MODEL).map((e) => e.worryId));
  const todo = store.get("worries").filter((w) => !w.demo && !have.has(w.id));
  if (!todo.length) return true;
  try {
    const vectors = await embed(todo.map((w) => w.text));
    // Memory may have been turned off (and its vectors deleted) while the model was running.
    if (!store.get("settings").memory) return false;
    const fresh: EmbeddingEntry[] = todo.map((w, i) => ({ worryId: w.id, model: EMBED_MODEL, vector: vectors[i].map((x) => Math.round(x * 1e5) / 1e5) }));
    store.update("embeddings", (list) => [...list.filter((e) => !fresh.some((f) => f.worryId === e.worryId)), ...fresh]);
    return true;
  } catch {
    return false;
  }
}

/** Memory line per worry id for the given (saved) worries; empty while memory is off or the model is loading. */
export function useMemoryLines(worryIds: readonly string[]): Record<string, string> {
  const [settings] = useStoreValue("settings");
  const [embeddings] = useStoreValue("embeddings");
  const [worries] = useStoreValue("worries");
  const [replays] = useStoreValue("replays");
  const [indexed, setIndexed] = useState(false);
  const key = worryIds.join(",");

  useEffect(() => {
    if (!settings.memory || !key) return;
    let alive = true;
    void indexWorries().then((ok) => alive && setIndexed(ok));
    return () => {
      alive = false;
    };
  }, [settings.memory, key]);

  if (!settings.memory || !indexed) return {};
  const current = new Set(worryIds);
  const lines: Record<string, string> = {};
  for (const id of worryIds) {
    const own = embeddings.find((e) => e.worryId === id && e.model === EMBED_MODEL);
    if (!own) continue;
    // Only EARLIER worries count (not the other lines of this same sort).
    const similar = similarWorries(own.vector, embeddings, { exclude: current, model: EMBED_MODEL });
    const line = memoryLine(summarize(similar, worries, replays));
    if (line) lines[id] = line;
  }
  return lines;
}
