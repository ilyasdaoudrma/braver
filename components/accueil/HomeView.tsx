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
    // Phone: one column (greeting, mood, "Vide ta tête", reminders).
    // PC: greeting, then a large "Vide ta tête" in the middle, then mood and reminders side by side.
    <section className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6" aria-labelledby="home-title">
      <h1
        id="home-title"
        className="font-display text-5xl font-light tracking-tight lg:col-span-2 lg:text-center lg:text-7xl"
      >
        <span className="accent-serif">{hydrated ? pick(lang, hello, hello === "Bonsoir" ? "Good evening" : "Hello") : pick(lang, "Bonjour", "Hello")}</span>
      </h1>

      <div className="lg:order-2">
        {hydrated ? (
          <MoodCheckIn />
        ) : (
          <div
            className="h-44 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none"
            aria-busy="true"
          />
        )}
      </div>

      <Link
        href="/vider"
        className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-3xl bg-ink p-5 text-paper shadow-[0_22px_44px_-22px_rgba(27,35,51,0.8)] hover:-translate-y-0.5 lg:order-1 lg:col-span-2 lg:min-h-72 lg:flex-col lg:justify-center lg:gap-5 lg:p-12 lg:text-center lg:shadow-[0_40px_80px_-40px_rgba(27,35,51,0.85)]"
      >
        <span
          aria-hidden
          className="absolute -top-10 -right-8 h-32 w-32 rounded-full opacity-70 blur-[2px] lg:-top-24 lg:-right-16 lg:h-72 lg:w-72"
          style={{ background: "conic-gradient(from 200deg, #5b3fd6, #b93d0a, #0b7065, #5b3fd6)" }}
        />
        <span
          aria-hidden
          className="absolute -bottom-28 -left-20 hidden h-64 w-64 rounded-full opacity-40 blur-[2px] lg:block"
          style={{ background: "conic-gradient(from 20deg, #0b7065, #5b3fd6, #b93d0a, #0b7065)" }}
        />
        <PenLine aria-hidden size={24} className="relative lg:size-9" />
        <span className="relative flex-1 lg:flex-none">
          <span className="block font-display text-2xl font-light lg:text-6xl">
            {pick(lang, "Vide ta ", "Clear your ")}
            <span className="accent-serif">{pick(lang, "tête", "head")}</span>
          </span>
          <span className="block text-sm opacity-80 lg:mt-3 lg:text-lg">
            {pick(lang, "Écris ce qui t'inquiète, on trie ensemble.", "Write what worries you, we sort it together.")}
          </span>
        </span>
        <ArrowRight aria-hidden size={20} className="relative transition-transform duration-300 group-hover:translate-x-1 lg:hidden" />
        <span className="relative hidden items-center gap-2 rounded-2xl bg-paper px-6 py-3 font-bold text-ink lg:inline-flex">
          {pick(lang, "Commencer", "Start")}
          <ArrowRight aria-hidden size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>

      <div className="flex flex-col gap-6 lg:order-3 lg:gap-4">

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
      </div>
    </section>
  );
}
