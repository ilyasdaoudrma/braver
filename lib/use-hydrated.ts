"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during hydration, true once the device data can be read (loading states). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
