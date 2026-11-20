"use client";
import { useSyncExternalStore } from "react";

/** UI language (French by default, English on request). A display preference, not personal data:
 *  kept in its own localStorage key, outside the consent-bound store. */
export type Lang = "fr" | "en";

const KEY = "braver-lang";
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return window.localStorage.getItem(KEY) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export function setLang(lang: Lang): void {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Private mode: the switch still works for this page view.
    memory = lang;
  }
  listeners.forEach((l) => l());
}

let memory: Lang | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => memory ?? read(), () => "fr");
}

/** Pick the string for the current language. */
export function pick<T>(lang: Lang, fr: T, en: T): T {
  return lang === "en" ? en : fr;
}
