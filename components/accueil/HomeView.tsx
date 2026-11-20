"use client";
import Link from "next/link";
import { ArrowRight, ClipboardList, History, PenLine } from "lucide-react";
import { pick, useLang } from "@/lib/i18n";
import { groupEntries, todayKey } from "@/lib/replay";
import { useNow } from "@/lib/use-now";
import { useStoreValue } from "@/lib/use-store";
import { MoodCheckIn } from "./MoodCheckIn";

const WEEK = 7 * 86_400_000;

export function HomeView() {
  const lang = useLang();
  const now = useNow();
  const hydrated = now !== null;
  const [replays] = useStoreValue("replays");
  const [gad7] = useStoreValue("gad7");
  const due =
    now === null ? [] : groupEntries(replays.filter((r) => !r.demo), todayKey(new Date(now))).due // own predictions only, never a demo reminder;
  const lastGad7 = gad7
    .filter((g) => !g.demo)
    .map((g) => Date.parse(g.at))
    .sort((a, b) => b - a)[0];
  const gad7Due = now !== null && (!lastGad7 || now - lastGad7 >= WEEK);
  const hour = now === null ? 12 : new Date(now).getHours();
  const hello = hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";

  return (
    <section className="space-y-6" aria-labelledby="home-title">
      <h1
        id="home-title"
        className="font-display text-5xl font-light tracking-tight"
      >
        <span className="accent-serif">{hydrated ? pick(lang, hello, hello === "Bonsoir" ? "Good evening" : "Hello") : pick(lang, "Bonjour", "Hello")}</span>
      </h1>

      {hydrated ? (
        <MoodCheckIn />
      ) : (
        <div
          className="h-44 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none"
          aria-busy="true"
        />
      )}

      <Link
        href="/vider"
        className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-3xl bg-ink p-5 text-paper shadow-[0_22px_44px_-22px_rgba(27,35,51,0.8)] hover:-translate-y-0.5"
      >
        <span
          aria-hidden
          className="absolute -top-10 -right-8 h-32 w-32 rounded-full opacity-70 blur-[2px]"
          style={{ background: "conic-gradient(from 200deg, #5b3fd6, #b93d0a, #0b7065, #5b3fd6)" }}
        />
        <PenLine aria-hidden size={24} className="relative" />
        <span className="relative flex-1">
          <span className="block font-display text-2xl font-light">
            {pick(lang, "Vide ta ", "Clear your ")}
            <span className="accent-serif">{pick(lang, "tête", "head")}</span>
          </span>
          <span className="block text-sm opacity-80">
            {pick(lang, "Écris ce qui t'inquiète, on trie ensemble.", "Write what worries you, we sort it together.")}
          </span>
        </span>
        <ArrowRight aria-hidden size={20} className="relative transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      {hydrated && due.length > 0 && (
        <Link
          href="/replay"
          className="enter flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
        >
          <History aria-hidden size={20} className="shrink-0 text-scenario" />
          <span className="flex-1">
            <span className="block font-bold">
              {due.length === 1
                ? "Une prédiction à vérifier"
                : `${due.length} prédictions à vérifier`}
            </span>
            <span className="block text-sm text-ink-2" dir="auto">
              {due[0].prediction}
            </span>
          </span>
          <ArrowRight aria-hidden size={18} className="text-ink-2" />
        </Link>
      )}

      {hydrated && gad7Due && (
        <Link
          href="/gad7"
          className="enter flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
        >
          <ClipboardList
            aria-hidden
            size={20}
            className="shrink-0 text-ink-2"
          />
          <span className="flex-1">
            <span className="block font-bold">Questionnaire de la semaine</span>
            <span className="block text-sm text-ink-2">
              7 questions, 2 minutes. Ton score dans le temps, sans étiquette.
            </span>
          </span>
          <ArrowRight aria-hidden size={18} className="text-ink-2" />
        </Link>
      )}
    </section>
  );
}
