"use client";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

/** Keeps <html lang> in line with the chosen UI language (screen readers, hyphenation). */
export function LangSync() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
