"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { useStoreValue } from "@/lib/use-store";

const TIMER_SECONDS = 10 * 60;

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Action card: fear before (0–10), a 10-minute timer, then "C'est fait". */
export function ActionPanel({ worryId }: { worryId: string }) {
  const id = useId();
  const [worries, updateWorries] = useStoreValue("worries");
  const worry = worries.find((w) => w.id === worryId);
  const [fear, setFear] = useState(5);
  const [left, setLeft] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);
  const endsAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const rest = Math.max(
        0,
        Math.round(((endsAt.current ?? Date.now()) - Date.now()) / 1000),
      );
      setLeft(rest);
      if (rest === 0) setRunning(false);
    };
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, [running]);

  if (worry?.doneAt) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl bg-action-soft p-3 font-bold text-action"
        role="status"
      >
        <Check aria-hidden size={18} />
        Fait. Ta peur avant : {worry.fearBefore ?? "?"} / 10.
      </div>
    );
  }

  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    endsAt.current = Date.now() + (left || TIMER_SECONDS) * 1000;
    if (!left) setLeft(TIMER_SECONDS);
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setLeft(TIMER_SECONDS);
  }

  function handleDone() {
    const at = new Date().toISOString();
    updateWorries((ws) =>
      ws.map((w) =>
        w.id === worryId ? { ...w, fearBefore: fear, doneAt: at } : w,
      ),
    );
    setRunning(false);
  }

  return (
    <div className="space-y-4 rounded-xl bg-surface-2 p-3">
      <div className="space-y-2">
        <label
          htmlFor={`${id}-f`}
          className="flex items-baseline justify-between font-bold"
        >
          <span>Ta peur avant de commencer</span>
          <span className="tabular-nums text-action" aria-hidden>
            {fear} / 10
          </span>
        </label>
        <input
          id={`${id}-f`}
          type="range"
          min={0}
          max={10}
          value={fear}
          onChange={(e) => setFear(Number(e.target.value))}
          aria-valuetext={`${fear} sur 10`}
          className="h-11 w-full accent-action"
        />
      </div>
      <div className="flex items-center gap-2">
        <p
          className="min-w-16 font-display text-2xl font-medium tabular-nums"
          aria-live="off"
        >
          {mmss(left)}
        </p>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-ink/20 px-4 font-bold"
        >
          {running ? (
            <Pause aria-hidden size={16} />
          ) : (
            <Play aria-hidden size={16} />
          )}
          {running
            ? "Mettre en pause"
            : left === TIMER_SECONDS
              ? "Lancer 10 minutes"
              : left === 0
                ? "Relancer"
                : "Reprendre"}
        </button>
        {left !== TIMER_SECONDS && (
          <button
            type="button"
            onClick={reset}
            aria-label="Remettre le minuteur à 10 minutes"
            className="inline-flex size-11 items-center justify-center rounded-full border border-ink/20"
          >
            <RotateCcw aria-hidden size={16} />
          </button>
        )}
      </div>
      {left === 0 && (
        <p role="status" className="text-sm text-ink-2">
          Les 10 minutes sont passées. Où en es-tu ?
        </p>
      )}
      <button
        type="button"
        onClick={handleDone}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-action px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98]"
      >
        <Check aria-hidden size={16} />
        C&apos;est fait
      </button>
    </div>
  );
}
