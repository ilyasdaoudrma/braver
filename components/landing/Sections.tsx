"use client";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Cpu, Lock, Phone } from "lucide-react";
import { motion } from "motion/react";
import type { Lang } from "@/lib/i18n";
import type { LandingCopy } from "./copy";
import { GhostLink, StartLink } from "./StartLink";

export interface ProofNumbers {
  safetyRecall: number | null;
  safetyN: number | null;
  onlineCaught: number | null;
  onlineDanger: number | null;
  onlineN: number | null;
  zonesAcc: number | null;
  zonesN: number | null;
}

const EASE = [0.2, 0.75, 0.2, 1] as const;
const ZONE_STYLE: Record<string, { dot: string; soft: string; text: string }> = {
  scenario: { dot: "bg-scenario", soft: "bg-scenario-soft", text: "text-scenario" },
  action: { dot: "bg-action", soft: "bg-action-soft", text: "text-action" },
  acceptation: { dot: "bg-acceptation", soft: "bg-acceptation-soft", text: "text-acceptation" },
};
const POINT_ICONS = [Cpu, Lock, Phone];

/** Percentage with 2 decimals, truncated (never rounded up). */
export function pct(x: number, lang: Lang): string {
  const s = (Math.floor(x * 10000 + 1e-9) / 100).toFixed(2);
  return `${lang === "fr" ? s.replace(".", ",") : s} %`;
}

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-xs font-bold tracking-[0.14em] text-ink-2">{children}</p>;
}

function Headline({ parts, className = "" }: { parts: string[]; className?: string }) {
  // Last-but-one part (or the only middle part) is the serif accent word.
  const accent = parts.length === 3 ? 1 : parts.length - 1;
  return (
    <h2 data-reveal className={`font-display text-[2.1rem] leading-[1.05] font-light tracking-tight text-balance md:text-6xl ${className}`}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && " "}
          {i === accent ? <span className="accent-serif">{p}</span> : p}
        </span>
      ))}
    </h2>
  );
}

export function Hero({ t }: { t: LandingCopy }) {
  const rise = (delay: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: EASE } });
  return (
    <section id="top" className="relative flex min-h-svh flex-col justify-start px-5 pt-28 pb-10 md:justify-center md:px-12 md:pb-0">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="font-display text-[4rem] leading-[0.95] font-light tracking-tight md:text-[7.5rem]">
          {[t.hero.l1, t.hero.l2].map((line, i) => (
            <span key={i} className="block overflow-hidden pb-2">
              <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease: EASE }}>
                {i === 1 ? <span className="accent-serif">{line}</span> : line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p {...rise(0.6)} className="mt-4 max-w-md text-lg leading-relaxed text-ink md:mt-6 md:text-xl">
          {t.hero.sub}
        </motion.p>
        <motion.div {...rise(0.74)} className="mt-7 flex flex-wrap gap-3">
          <StartLink>{t.hero.start}</StartLink>
          <GhostLink href="#zones">{t.hero.how}</GhostLink>
        </motion.div>
      </div>
      <motion.a
        href="#zones"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
        whileHover={{ y: -4 }}
        className="glass absolute right-5 bottom-10 hidden h-36 w-44 flex-col justify-between rounded-2xl p-4 text-2xl leading-tight font-light md:right-12 md:flex"
      >
        <span className="font-display">
          {t.hero.scroll[0]}
          <br />
          {t.hero.scroll[1]}
        </span>
        <ArrowDown aria-hidden size={22} className="self-end motion-safe:animate-[bob_2.2s_ease-in-out_infinite]" />
      </motion.a>
    </section>
  );
}

export function Zones({ t }: { t: LandingCopy }) {
  return (
    <section id="zones" className="relative px-5 py-24 md:px-12 md:py-0">
      <div data-pin="zones" className="mx-auto grid max-w-6xl items-center gap-10 md:min-h-svh md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div>
          <Eyebrow>{t.zones.eyebrow}</Eyebrow>
          <Headline parts={t.zones.title} className="mt-4" />
          <p data-reveal className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
            {t.zones.lede}
          </p>
        </div>
        <ol className="space-y-4">
          {t.zones.items.map((z, i) => {
            const s = ZONE_STYLE[z.key];
            return (
              <li key={z.key} data-zone-card className="glass rounded-3xl p-5 shadow-[0_24px_50px_-34px_rgba(27,35,51,0.5)] md:p-6">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 rounded-full ${s.soft} px-3 py-1.5 text-sm font-bold ${s.text}`}>
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    {z.name}
                  </span>
                  <span className="font-mono text-xs text-ink-2">0{i + 1}</span>
                </div>
                <p className="mt-4 font-display text-xl font-normal md:text-2xl">{z.what}</p>
                <p className="mt-2 text-ink-2 italic">{z.example}</p>
                <p className="mt-3 border-t border-line pt-3 leading-relaxed">{z.then}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function Safety({ t }: { t: LandingCopy }) {
  return (
    <section id="safety" className="relative px-5 py-24 md:px-12 md:py-40">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Eyebrow>{t.safety.eyebrow}</Eyebrow>
          <Headline parts={t.safety.title} className="mt-4" />
          <p data-reveal className="mt-5 text-lg leading-relaxed text-ink-2">
            {t.safety.lede}
          </p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {t.safety.points.map((p, i) => {
            const Icon = POINT_ICONS[i];
            return (
              <li key={p.t} data-reveal className="glass rounded-3xl p-6">
                <Icon aria-hidden size={22} strokeWidth={1.6} className="text-ink" />
                <p className="mt-5 font-display text-xl">{p.t}</p>
                <p className="mt-2 leading-relaxed text-ink-2">{p.d}</p>
              </li>
            );
          })}
        </ul>
        <ul data-reveal className="mt-8 flex flex-wrap gap-2.5" aria-label="Numéros">
          {t.safety.numbers.map((n) => (
            <li key={n.n}>
              <a href={`tel:${n.n}`} className="glass inline-flex min-h-11 items-center gap-2.5 rounded-full px-4 hover:bg-surface">
                <span className="font-mono text-base font-bold text-danger">{n.n}</span>
                <span className="text-sm text-ink-2">{n.l}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Proof({ t, lang, m }: { t: LandingCopy; lang: Lang; m: ProofNumbers }) {
  const stats = [
    m.safetyRecall !== null && { big: pct(m.safetyRecall, lang), value: m.safetyRecall, label: t.proof.safetyDevice, n: m.safetyN, nNote: t.proof.nDanger },
    m.onlineCaught !== null && { big: `${m.onlineCaught} / ${m.onlineDanger}`, value: null, label: t.proof.safetyOnline, n: m.onlineN },
    m.zonesAcc !== null && { big: pct(m.zonesAcc, lang), value: m.zonesAcc, label: t.proof.zones, n: m.zonesN },
  ].filter(Boolean) as { big: string; value: number | null; label: string; n: number | null; nNote?: string }[];
  return (
    <section id="proof" className="relative px-5 py-24 md:px-12 md:py-40">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Eyebrow>{t.proof.eyebrow}</Eyebrow>
          <Headline parts={t.proof.title} className="mt-4" />
          <p data-reveal className="mt-5 text-lg leading-relaxed text-ink-2">
            {t.proof.lede}
          </p>
        </div>
        <dl className="mt-12 grid border-y border-ink/10 md:grid-cols-3">
          {stats.map((s, i) => (
            <div key={i} data-reveal className={`py-7 md:px-7 ${i > 0 ? "border-t border-ink/10 md:border-t-0 md:border-l" : ""}`}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span key={lang} data-count={s.value ?? undefined} className="block font-display text-5xl font-light tracking-tight tabular-nums md:text-6xl">
                  {s.big}
                </span>
                <span className="mt-3 block leading-snug text-ink-2">{s.label}</span>
                {s.n !== null && <span className="mt-2 block font-mono text-xs text-ink-2">n = {s.n}{s.nNote ? ` ${s.nNote}` : ""}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p data-reveal className="mt-6 max-w-xl text-sm text-ink-2">
          {t.proof.caveat}
        </p>
        <Link data-reveal href="/labo" className="group mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl font-bold text-ink">
          {t.proof.labo}
          <ArrowUpRight aria-hidden size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </section>
  );
}

export function End({ t }: { t: LandingCopy }) {
  return (
    <section id="end" className="relative flex min-h-svh flex-col px-5 pt-32 pb-8 md:px-12">
      <div data-reveal className="glass mx-auto w-full max-w-3xl rounded-[2rem] px-6 py-12 text-center shadow-[0_40px_90px_-40px_rgba(8,10,30,0.8)] md:px-14 md:py-16">
        <h2 className="font-display text-5xl leading-[1] font-light tracking-tight md:text-7xl">
          {t.end.title[0]} <span className="accent-serif">{t.end.title[1]}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-2">{t.end.lede}</p>
        <div className="mt-8 flex justify-center">
          <StartLink>{t.end.start}</StartLink>
        </div>
        <p className="mt-6 font-mono text-xs tracking-wide text-ink-2">{t.end.note}</p>
      </div>
      <footer className="mx-auto mt-auto w-full max-w-6xl pt-24 text-[rgba(240,236,255,0.82)]">
        <div className="flex flex-col gap-6 border-b border-[rgba(240,236,255,0.18)] pb-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-sm leading-relaxed">{t.end.disclaimer}</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-2 text-sm font-bold">
            <Link href="/labo" className="rounded-xl px-3 py-2.5 hover:bg-[rgba(240,236,255,0.12)]">{t.end.links.labo}</Link>
            <Link href="/securite" className="rounded-xl px-3 py-2.5 hover:bg-[rgba(240,236,255,0.12)]">{t.end.links.help}</Link>
            <Link href="/accueil" className="rounded-xl px-3 py-2.5 hover:bg-[rgba(240,236,255,0.12)]">{t.end.links.app}</Link>
          </nav>
        </div>
        <p className="mt-4 text-xs opacity-80">{t.end.made}</p>
        <p
          aria-hidden
          className="mt-4 bg-[linear-gradient(180deg,rgba(240,236,255,0.35),rgba(240,236,255,0)_85%)] bg-clip-text text-center font-display text-[22vw] leading-[0.8] font-light tracking-tighter text-transparent select-none md:text-[15rem]"
        >
          BRAVER
        </p>
      </footer>
    </section>
  );
}
