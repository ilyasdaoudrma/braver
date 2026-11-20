"use client";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { LangToggle } from "@/components/i18n/LangToggle";
import { Logo } from "@/components/nav/Logo";
import type { LandingCopy } from "./copy";
import { StartLink } from "./StartLink";

export function LandingNav({ t }: { t: LandingCopy }) {
  return (
    <header data-in="nav" className="fixed inset-x-0 top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] md:px-6 md:pt-5">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl px-2.5 shadow-[0_12px_30px_-22px_rgba(27,35,51,0.45)] md:h-16 md:px-4">
        <a href="#top" className="rounded-xl px-1.5 py-1" aria-label="BRAVER">
          <Logo />
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 text-sm font-bold text-ink-2 lg:flex">
          {[
            ["#zones", t.nav.how],
            ["#safety", t.nav.safety],
            ["#proof", t.nav.proof],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-xl px-3.5 py-2.5 hover:bg-surface-2 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <Link
            href="/securite"
            aria-label={t.end.links.help}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-danger/25 bg-surface text-danger hover:bg-danger-soft sm:w-auto sm:gap-2 sm:px-4"
          >
            <LifeBuoy aria-hidden size={18} />
            <span className="hidden text-sm font-bold sm:inline">{t.end.links.help}</span>
          </Link>
          <span className="hidden md:block">
            <StartLink className="!min-h-11 !px-4 !text-sm">{t.nav.open}</StartLink>
          </span>
        </div>
      </div>
    </header>
  );
}
