"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HelpButton } from "@/components/nav/HelpButton";
import { GAD7_ANSWERS, GAD7_INTRO, GAD7_QUESTIONS, GAD7_SUGGEST_FROM, gad7Score, trendText } from "@/lib/gad7";
import { uid } from "@/lib/store";
import { useStoreValue } from "@/lib/use-store";

/** One question per screen. Score and trend only, never a label (CLAUDE.md). */
export function Gad7View() {
  const [entries, updateEntries] = useStoreValue("gad7");
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const i = answers.length;
  const heading = useRef<HTMLHeadingElement | null>(null);

  // New question or result: focus its heading (the clicked button is gone after the remount).
  useEffect(() => {
    if (i > 0 || score !== null) heading.current?.focus();
  }, [i, score]);

  function answer(value: number) {
    const next = [...answers, value];
    if (next.length < GAD7_QUESTIONS.length) {
      setAnswers(next);
      return;
    }
    const s = gad7Score(next);
    updateEntries((list) => [...list, { id: uid(), at: new Date().toISOString(), answers: next, score: s }]);
    setAnswers(next);
    setScore(s);
  }

  if (score !== null) {
    const own = entries.filter((e) => !e.demo).sort((a, b) => a.at.localeCompare(b.at));
    const trend = trendText(own.map((e) => e.score));
    return (
      <section className="enter space-y-5" aria-labelledby="gad-done">
        <h1 id="gad-done" ref={heading} tabIndex={-1} className="font-display text-4xl font-light tracking-tight focus:outline-none">
          Merci
        </h1>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-ink-2">Ton score sur les deux dernières semaines</p>
          <p className="font-display text-6xl font-light tabular-nums">
            {score}
            <span className="text-2xl text-ink-2"> / 21</span>
          </p>
          {trend && <p className="mt-2">{trend}</p>}
        </div>
        {score >= GAD7_SUGGEST_FROM && (
          <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
            <p>
              Ces deux dernières semaines ont l&apos;air lourdes. En parler à un·e professionnel·le (médecin, psychologue, service de santé de ta
              fac) peut aider. Tu n&apos;as pas à porter ça seul·e.
            </p>
            <HelpButton />
          </div>
        )}
        <p className="text-sm text-ink-2">Ce questionnaire ne donne pas de diagnostic. Il sert à suivre l&apos;évolution dans le temps.</p>
        <Link href="/suivi" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-bold text-paper">
          Voir mon suivi
        </Link>
      </section>
    );
  }

  return (
    <section key={i} className="enter space-y-6" aria-labelledby="gad-q">
      <div className="flex items-center justify-between text-sm text-ink-2">
        {i > 0 ? (
          <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="inline-flex min-h-11 items-center gap-1 font-bold">
            <ArrowLeft aria-hidden size={16} />
            Question précédente
          </button>
        ) : (
          <span>Questionnaire de la semaine</span>
        )}
        <span className="tabular-nums">
          {i + 1} / {GAD7_QUESTIONS.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-ink transition-transform duration-200 origin-left" style={{ transform: `scaleX(${i / GAD7_QUESTIONS.length})` }} />
      </div>
      <div className="space-y-2">
        <p className="text-ink-2">{GAD7_INTRO}</p>
        <h1 id="gad-q" ref={heading} tabIndex={-1} className="font-display text-2xl font-medium focus:outline-none">
          {GAD7_QUESTIONS[i]}
        </h1>
      </div>
      <div className="grid gap-2" role="group" aria-labelledby="gad-q">
        {GAD7_ANSWERS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => answer(a.value)}
            className="min-h-14 rounded-2xl border border-line bg-surface px-4 text-left font-bold transition-[background-color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.98]"
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
