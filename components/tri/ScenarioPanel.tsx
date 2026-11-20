"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { CalendarCheck, NotebookPen } from "lucide-react";
import type { SortCard } from "@/lib/sort/engine";
import { CHECK_DELAYS, makeEntry } from "@/lib/replay";
import { uid } from "@/lib/store";
import { useStoreValue } from "@/lib/use-store";

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Scenario card: how sure the person is, and when to check. Saves a Replay entry. */
export function ScenarioPanel({
  card,
  worryId,
}: {
  card: SortCard;
  worryId: string;
}) {
  const id = useId();
  const [replays, updateReplays] = useStoreValue("replays");
  const [certainty, setCertainty] = useState(70);
  const [days, setDays] = useState<number>(CHECK_DELAYS[0].days);
  const noted = replays.find((r) => r.worryId === worryId);

  if (noted) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl bg-scenario-soft p-3 text-scenario"
        role="status"
      >
        <CalendarCheck aria-hidden size={18} className="mt-0.5 shrink-0" />
        <p>
          Prédiction notée, sûr·e à {noted.certainty} %. On te la repose{" "}
          {formatDay(noted.checkAt)}.{" "}
          <Link
            href="/replay"
            className="font-bold underline underline-offset-4"
          >
            Voir le Replay
          </Link>
        </p>
      </div>
    );
  }

  function handleNote() {
    const prediction = card.prediction ?? card.text;
    updateReplays((list) =>
      list.some((r) => r.worryId === worryId)
        ? list
        : [
            ...list,
            makeEntry({
              id: uid(),
              worryId,
              text: card.text,
              prediction,
              question: card.question,
              certainty,
              days,
            }),
          ],
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-surface-2 p-3">
      <div className="space-y-2">
        <label
          htmlFor={`${id}-c`}
          className="flex items-baseline justify-between font-bold"
        >
          <span>À quel point tu en es sûr·e ?</span>
          <span className="tabular-nums text-scenario" aria-hidden>
            {certainty} %
          </span>
        </label>
        <input
          id={`${id}-c`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={certainty}
          onChange={(e) => setCertainty(Number(e.target.value))}
          aria-valuetext={`${certainty} %`}
          className="h-11 w-full accent-scenario"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-bold">Quand vérifier ?</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
          {CHECK_DELAYS.map((d) => (
            <label
              key={d.days}
              className={`flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2 text-center text-sm font-bold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                days === d.days ? "bg-scenario text-paper" : "text-ink-2"
              }`}
            >
              <input
                type="radio"
                name={`${id}-d`}
                value={d.days}
                checked={days === d.days}
                onChange={() => setDays(d.days)}
                className="sr-only"
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={handleNote}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-scenario px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98]"
      >
        <NotebookPen aria-hidden size={16} />
        Noter ma prédiction
      </button>
    </div>
  );
}
