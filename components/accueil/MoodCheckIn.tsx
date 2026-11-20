"use client";
import { useState } from "react";
import {
  Angry,
  Check,
  Frown,
  Laugh,
  Meh,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { uid } from "@/lib/store";
import type { MoodLevel } from "@/lib/types";
import { useStoreValue } from "@/lib/use-store";
import { useNow } from "@/lib/use-now";

export const MOODS: { level: MoodLevel; label: string; icon: LucideIcon }[] = [
  { level: 1, label: "Très mal", icon: Angry },
  { level: 2, label: "Pas bien", icon: Frown },
  { level: 3, label: "Moyen", icon: Meh },
  { level: 4, label: "Bien", icon: Smile },
  { level: 5, label: "Très bien", icon: Laugh },
];

export const EMOTIONS = [
  "stressé·e",
  "fatigué·e",
  "inquiet·e",
  "seul·e",
  "triste",
  "en colère",
  "calme",
  "motivé·e",
];

function sameDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** One tap for the mood (5 levels), optional emotion chips. */
export function MoodCheckIn() {
  const [moods, updateMoods] = useStoreValue("moods");
  const [level, setLevel] = useState<MoodLevel | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const now = useNow();
  const today =
    now === null
      ? undefined
      : moods.filter((m) => !m.demo && sameDay(m.at, new Date(now))).at(-1);

  if (today && !editing) {
    const mood = MOODS.find((m) => m.level === today.level);
    const time = new Date(today.at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
        role="status"
      >
        <Check aria-hidden size={18} className="text-acceptation" />
        <p className="flex-1">
          Humeur notée à {time} :{" "}
          <span className="font-bold">{mood?.label}</span>
          {today.emotions.length > 0 && (
            <span className="text-ink-2"> · {today.emotions.join(", ")}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 px-2 text-sm font-bold text-ink-2 underline underline-offset-4"
        >
          Changer
        </button>
      </div>
    );
  }

  function toggle(e: string) {
    setEmotions((list) =>
      list.includes(e) ? list.filter((x) => x !== e) : [...list, e],
    );
  }

  function save() {
    if (!level) return;
    const at = new Date().toISOString();
    // "Changer" replaces today's entry instead of adding a second point for the same day.
    updateMoods((list) =>
      editing && today
        ? list.map((m) => (m.id === today.id ? { ...m, at, level, emotions } : m))
        : [...list, { id: uid(), at, level, emotions }],
    );
    setEditing(false);
    setLevel(null);
    setEmotions([]);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <fieldset className="space-y-3">
        <legend className="font-bold">Comment tu te sens maintenant ?</legend>
        <div className="grid grid-cols-5 gap-1">
          {MOODS.map(({ level: l, label, icon: Icon }) => (
            <label
              key={l}
              className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold transition-[background-color,transform] duration-200 ease-out active:scale-95 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                level === l ? "bg-ink text-paper" : "bg-surface-2 text-ink-2"
              }`}
            >
              <input
                type="radio"
                name="mood"
                value={l}
                checked={level === l}
                onChange={() => setLevel(l)}
                className="sr-only"
              />
              <Icon aria-hidden size={22} />
              <span className="text-center leading-tight">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {level && (
        <fieldset className="enter space-y-2">
          <legend className="text-sm font-bold text-ink-2">
            Ce que tu ressens (facultatif)
          </legend>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emotions.includes(e)}
                onClick={() => toggle(e)}
                className={`min-h-9 rounded-full border px-3 text-sm font-bold transition-colors duration-200 ${
                  emotions.includes(e)
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink-2"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {editing && (
        <button type="button" onClick={() => setEditing(false)} className="min-h-11 w-full rounded-full border border-ink/20 px-5 font-bold">
          Garder mon humeur
        </button>
      )}
      <button
        type="button"
        onClick={save}
        disabled={!level}
        className="min-h-11 w-full rounded-full bg-ink px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-40"
      >
        Noter mon humeur
      </button>
    </div>
  );
}
