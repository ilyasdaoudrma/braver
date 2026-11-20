"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { pick, useLang } from "@/lib/i18n";
import { isActiveTab, NAV_TABS } from "./routes";

/** Floating glass tab bar; the active pill slides between tabs. */
export function BottomNav() {
  const pathname = usePathname();
  const lang = useLang();
  return (
    <nav
      aria-label={pick(lang, "Navigation principale", "Main navigation")}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden"
    >
      <ul className="glass mx-auto grid h-(--nav-h) max-w-md grid-cols-5 rounded-[1.4rem] px-1.5 shadow-[0_18px_40px_-20px_rgba(27,35,51,0.35)]">
        {NAV_TABS.map((tab) => {
          const active = isActiveTab(tab, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative my-1.5 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] ${
                  active ? "font-bold text-paper" : "text-ink-2 hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    aria-hidden
                    className="absolute inset-0 -z-0 rounded-2xl bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon aria-hidden size={20} strokeWidth={active ? 2.1 : 1.7} className="relative" />
                <span className="relative">{pick(lang, tab.label, tab.labelEn)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
