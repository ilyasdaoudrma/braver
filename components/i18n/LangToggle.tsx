"use client";
import { motion } from "motion/react";
import { setLang, useLang, type Lang } from "@/lib/i18n";

const OPTIONS: readonly Lang[] = ["fr", "en"];

/** FR / EN segmented switch with a sliding pill. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label={lang === "en" ? "Language" : "Langue"} className={`glass relative flex h-11 items-center rounded-full p-1 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={lang === o}
          onClick={() => setLang(o)}
          className="relative z-10 h-9 min-w-10 rounded-full px-2.5 text-xs font-bold uppercase tracking-wide text-ink-2 aria-pressed:text-paper"
        >
          {lang === o && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 -z-10 rounded-full bg-ink"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          {o}
        </button>
      ))}
    </div>
  );
}
