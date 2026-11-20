"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { pick, useLang } from "@/lib/i18n";
import { isActiveTab, NAV_TABS } from "./routes";

/** PC navigation: the same five tabs as the phone's bottom bar, inside the top bar (≥ 1024 px). */
export function TopNav() {
  const pathname = usePathname();
  const lang = useLang();
  return (
    <nav aria-label={pick(lang, "Navigation principale", "Main navigation")} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV_TABS.map((tab) => {
          const active = isActiveTab(tab, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${active ? "text-paper" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                {active && (
                  <motion.span
                    layoutId="top-nav-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-xl bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon aria-hidden size={18} strokeWidth={active ? 2.1 : 1.7} className="relative" />
                <span className="relative">{pick(lang, tab.label, tab.labelEn)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
