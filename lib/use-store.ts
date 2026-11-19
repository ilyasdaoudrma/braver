"use client";
// React binding for lib/store.ts. Server render and first client render use the defaults,
// then the stored value appears (no hydration mismatch).
import { useCallback, useSyncExternalStore } from "react";
import { defaults, store, type StoreData, type StoreKey } from "./store";

const SERVER_DEFAULTS = defaults();

export function useStoreValue<K extends StoreKey>(key: K): [StoreData[K], (fn: (current: StoreData[K]) => StoreData[K]) => void] {
  const value = useSyncExternalStore(
    store.subscribe,
    () => store.get(key),
    () => SERVER_DEFAULTS[key],
  );
  const update = useCallback((fn: (current: StoreData[K]) => StoreData[K]) => store.update(key, fn), [key]);
  return [value, update];
}
