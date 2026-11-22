"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Trash2 } from "lucide-react";
import { clearDemo, loadDemo } from "@/lib/demo";
import { store } from "@/lib/store";
import type { Tone } from "@/lib/types";
import { useStoreValue } from "@/lib/use-store";
import { AiKeySetting } from "./AiKeySetting";
import { MemorySetting } from "./MemorySetting";

const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: "doux", label: "Doux", hint: "Calme et chaleureux" },
  { value: "direct", label: "Direct", hint: "Phrases plus courtes" },
];

/** Settings, demo data and "Effacer mes données" (destructive, confirmed). */
export function PlusSettings() {
  const router = useRouter();
  const [settings, updateSettings] = useStoreValue("settings");
  const [confirming, setConfirming] = useState(false);

  function wipe() {
    store.wipe();
    setConfirming(false);
    router.replace("/onboarding");
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="font-bold">Ton des réponses</legend>
        <div className="grid grid-cols-2 gap-2">
          {TONES.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-2xl border-2 bg-surface p-3 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                settings.tone === t.value ? "border-ink" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="tone"
                value={t.value}
                checked={settings.tone === t.value}
                onChange={() =>
                  updateSettings((s) => ({ ...s, tone: t.value }))
                }
                className="sr-only"
              />
              <span className="block font-bold">{t.label}</span>
              <span className="block text-sm text-ink-2">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="flex-1">
          <span className="block font-bold">
            Tri sur le téléphone seulement
          </span>
          <span className="block text-sm text-ink-2">
            Aucun texte envoyé à l&apos;IA. Une phrase ambiguë ouvre alors
            l&apos;écran d&apos;aide.
          </span>
        </span>
        <input
          type="checkbox"
          checked={settings.forceLocal}
          onChange={(e) =>
            updateSettings((s) => ({ ...s, forceLocal: e.target.checked }))
          }
          className="size-6 accent-ink"
        />
      </label>

      <AiKeySetting />

      <MemorySetting />

      <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
        <p className="flex items-center gap-2 font-bold">
          <FlaskConical aria-hidden size={18} />
          Démo de Yassine
        </p>
        <p className="text-sm text-ink-2">
          30 jours de données fictives pour montrer le Suivi et le Replay.
          Chaque élément est marqué « Exemple ».
        </p>
        {settings.demo ? (
          <button
            type="button"
            onClick={() => clearDemo(store)}
            className="min-h-11 rounded-full border border-ink/20 px-4 font-bold"
          >
            Retirer la démo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => loadDemo(store)}
            className="min-h-11 rounded-full bg-ink px-4 font-bold text-paper"
          >
            Charger la démo de Yassine
          </button>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-danger/40 bg-surface p-4">
        <p className="font-bold">Effacer mes données</p>
        <p className="text-sm text-ink-2">
          Inquiétudes, Replay, humeurs, respirations, questionnaires et réglages
          de ce téléphone. Rien n&apos;est gardé ailleurs.
        </p>
        {confirming ? (
          <div
            className="enter flex flex-wrap gap-2"
            role="alertdialog"
            aria-label="Confirmer l'effacement"
          >
            <button
              type="button"
              onClick={wipe}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-danger px-4 font-bold text-paper"
            >
              <Trash2 aria-hidden size={16} />
              Oui, tout effacer
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 rounded-full border border-ink/20 px-4 font-bold"
            >
              Garder mes données
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-danger px-4 font-bold text-danger"
          >
            <Trash2 aria-hidden size={16} />
            Effacer mes données
          </button>
        )}
      </div>
    </div>
  );
}
