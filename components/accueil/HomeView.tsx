"use client";
import Link from "next/link";
import { ArrowRight, ClipboardList, History, PenLine } from "lucide-react";
import { groupEntries, todayKey } from "@/lib/replay";
import { useNow } from "@/lib/use-now";
import { useStoreValue } from "@/lib/use-store";
import { MoodCheckIn } from "./MoodCheckIn";

const WEEK = 7 * 86_400_000;

export function HomeView() {
  const now = useNow();
  const hydrated = now !== null;
  const [replays] = useStoreValue("replays");
  const [gad7] = useStoreValue("gad7");
  const due =
    now === null ? [] : groupEntries(replays, todayKey(new Date(now))).due;
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
        className="font-display text-3xl font-bold tracking-tight"
      >
        {hydrated ? hello : "Bonjour"}
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
        className="flex min-h-20 items-center gap-4 rounded-2xl bg-ink p-5 text-paper transition-transform duration-200 ease-out active:scale-[0.98]"
      >
        <PenLine aria-hidden size={24} />
        <span className="flex-1">
          <span className="block font-display text-xl font-bold">
            Vide ta tête
          </span>
          <span className="block text-sm opacity-80">
            Écris ce qui t&apos;inquiète, on trie ensemble.
          </span>
        </span>
        <ArrowRight aria-hidden size={20} />
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
