"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Play, SkipForward, Vibrate } from "lucide-react";
import { BREATHING_CLAIM, breathAt, DURATIONS, type BreathState } from "@/lib/breathing";
import { uid } from "@/lib/store";
import type { MoodLevel } from "@/lib/types";
import { useStoreValue } from "@/lib/use-store";
import { MOODS } from "@/components/accueil/MoodCheckIn";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Shorter sessions are not saved (a "Passer" right after starting is not a session). */
const MIN_SAVED_SEC = 10;

type Step = "setup" | "run" | "after" | "saved";

function MoodPicker({ name, value, onChange, legend }: { name: string; value: MoodLevel | null; onChange: (m: MoodLevel) => void; legend: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-bold">{legend}</legend>
      <div className="grid grid-cols-5 gap-1">
        {MOODS.map(({ level, label, icon: Icon }) => (
          <label
            key={level}
            className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
              value === level ? "bg-ink text-paper" : "bg-surface-2 text-ink-2"
            }`}
          >
            <input type="radio" name={name} value={level} checked={value === level} onChange={() => onChange(level)} className="sr-only" />
            <Icon aria-hidden size={20} />
            <span className="text-center leading-tight">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Circle({ state, still }: { state: BreathState; still: boolean }) {
  // Scale grows on the inhales, shrinks on the exhale. Reduced motion: no scale, the words guide the breath.
  const from = state.index === 0 ? 1 : state.index === 1 ? 1.35 : 1.5;
  const scale = from + (state.phase.scale - from) * state.progress;
  return (
    <div className="flex h-72 items-center justify-center" aria-hidden>
      <div
        className="size-40 rounded-full bg-acceptation-soft ring-4 ring-acceptation/40"
        style={still ? undefined : { transform: `scale(${scale.toFixed(3)})`, transition: "transform 80ms linear" }}
      />
    </div>
  );
}

/** Cyclic sighing, 2 or 5 minutes, mood before and after, optional vibration, "Passer" at any time. */
export function BreathingView() {
  const [, updateBreathing] = useStoreValue("breathing");
  const [step, setStep] = useState<Step>("setup");
  const [durationSec, setDurationSec] = useState<number>(DURATIONS[0].sec);
  const [vibrate, setVibrate] = useState(false);
  const [before, setBefore] = useState<MoodLevel | null>(null);
  const [after, setAfter] = useState<MoodLevel | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const lastPhase = useRef(-1);
  const state = breathAt(elapsed, durationSec);
  const still = useReducedMotion();
  const heading = useRef<HTMLHeadingElement | null>(null);

  // Move focus to the new screen's heading so keyboard and screen-reader users are not left on <body>.
  useEffect(() => {
    if (step !== "setup") heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "run") return;
    // A short interval (not requestAnimationFrame): it keeps counting when the screen is hidden or locked,
    // and the time always comes from the clock, so a late tick never drifts.
    const tick = () => {
      const t = performance.now() - startedAt.current;
      setElapsed(t);
      const s = breathAt(t, durationSec);
      if (s.done) {
        setStep("after");
        return;
      }
      if (vibrate && s.index !== lastPhase.current && "vibrate" in navigator) navigator.vibrate(s.index === 2 ? [30, 60, 30] : 40);
      lastPhase.current = s.index;
    };
    const timer = window.setInterval(tick, 80);
    return () => window.clearInterval(timer);
  }, [step, durationSec, vibrate]);

  function start() {
    startedAt.current = performance.now();
    lastPhase.current = -1;
    setElapsed(0);
    setStep("run");
  }

  function save() {
    const done = Math.min(durationSec, Math.round(elapsed / 1000));
    if (done < MIN_SAVED_SEC) {
      setStep("saved");
      return;
    }
    updateBreathing((list) => [...list, { id: uid(), at: new Date().toISOString(), durationSec: done, moodBefore: before, moodAfter: after }]);
    setStep("saved");
  }

  if (step === "run") {
    const left = Math.max(0, Math.ceil(durationSec - elapsed / 1000));
    return (
      <section className="enter space-y-4 text-center" aria-labelledby="breath-phase">
        <Circle state={state} still={still} />
        <p id="breath-phase" ref={heading} tabIndex={-1} className="font-display text-2xl font-medium focus:outline-none" aria-live="polite">
          {state.phase.label}
        </p>
        <p className="tabular-nums text-ink-2">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} restantes
        </p>
        <button type="button" onClick={() => setStep("after")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-5 font-bold">
          <SkipForward aria-hidden size={16} />
          Passer
        </button>
      </section>
    );
  }

  if (step === "after") {
    return (
      <section className="enter space-y-6" aria-labelledby="after-title">
        <h1 id="after-title" ref={heading} tabIndex={-1} className="font-display text-4xl font-light tracking-tight focus:outline-none">
          Et maintenant ?
        </h1>
        <MoodPicker name="after" legend="Comment tu te sens après ?" value={after} onChange={setAfter} />
        <button type="button" onClick={save} className="min-h-12 w-full rounded-full bg-ink px-6 font-bold text-paper">
          Enregistrer la séance
        </button>
      </section>
    );
  }

  if (step === "saved") {
    return (
      <section className="enter space-y-4 rounded-2xl border border-line bg-surface p-5" role="status">
        <p ref={heading} tabIndex={-1} className="flex items-center gap-2 font-bold focus:outline-none">
          <Check aria-hidden size={18} className="text-acceptation" />
          {elapsed / 1000 < MIN_SAVED_SEC ? "Séance trop courte pour être comptée." : "Séance enregistrée."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStep("setup")} className="min-h-11 rounded-full border border-ink/20 px-4 font-bold">
            Recommencer
          </button>
          <Link href="/accueil" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-bold text-paper">
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="enter space-y-6" aria-labelledby="breath-title">
      <div className="space-y-2">
        <h1 id="breath-title" className="font-display text-4xl font-light tracking-tight">
          Respirer
        </h1>
        <p className="text-ink-2">Le soupir cyclique : deux inspirations par le nez, puis une longue expiration par la bouche.</p>
        <p className="text-sm text-ink-2">{BREATHING_CLAIM}</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-bold">Durée</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
          {DURATIONS.map((d) => (
            <label
              key={d.sec}
              className={`flex min-h-10 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                durationSec === d.sec ? "bg-ink text-paper" : "text-ink-2"
              }`}
            >
              <input type="radio" name="duration" value={d.sec} checked={durationSec === d.sec} onChange={() => setDurationSec(d.sec)} className="sr-only" />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>
      <MoodPicker name="before" legend="Comment tu te sens avant ? (facultatif)" value={before} onChange={setBefore} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} className="size-5 accent-ink" />
        <Vibrate aria-hidden size={18} className="text-ink-2" />
        <span>Vibrer à chaque changement (si ton téléphone le permet)</span>
      </label>
      <button type="button" onClick={start} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-acceptation px-6 font-bold text-paper">
        <Play aria-hidden size={18} />
        Commencer {DURATIONS.find((d) => d.sec === durationSec)?.label}
      </button>
    </section>
  );
}
