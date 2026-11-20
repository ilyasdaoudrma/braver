"use client";
import { useEffect, useId, useState } from "react";
import { Cpu, Loader2, Sparkles } from "lucide-react";
import { checkSafety, type SafetyCheck } from "@/lib/safety/pipeline";
import { getSafetyModel, loadSafetyModel } from "@/lib/safety/model";
import { getZonesModel, loadZonesModel, zoneOnDevice, type ZoneGuess } from "@/lib/zones/model";
import type { ApiSortResponse } from "@/lib/sort/api";

const LEVEL: Record<SafetyCheck["level"], string> = {
  danger: "Danger → écran d'aide tout de suite",
  check: "Ambigu → l'IA décide (sans réseau : écran d'aide)",
  hopeless: "Désespoir → carte d'aide douce",
  none: "Pas de danger détecté",
};

const pct = (x: number) => `${(Math.floor(x * 1000) / 10).toFixed(1).replace(".", ",")} %`; // truncated

/** "Tester une phrase": each layer's decision, on the device, then (on demand) the LLM. */
export function TryPhrase() {
  const id = useId();
  const [text, setText] = useState("");
  const [device, setDevice] = useState<{ safety: SafetyCheck; zone: ZoneGuess } | null>(null);
  const [llm, setLlm] = useState<{ state: "idle" | "loading" | "done" | "error"; res?: ApiSortResponse }>({ state: "idle" });

  useEffect(() => {
    void loadSafetyModel();
    void loadZonesModel();
  }, []);

  async function runDevice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    await Promise.all([loadSafetyModel(), loadZonesModel()]);
    setDevice({ safety: checkSafety(t, getSafetyModel()), zone: zoneOnDevice(t, getZonesModel()) });
    setLlm({ state: "idle" });
  }

  async function runLlm() {
    setLlm({ state: "loading" });
    try {
      const r = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worries: [{ text: text.trim().slice(0, 500) }], tone: "doux" }),
        signal: AbortSignal.timeout(20_000),
      });
      setLlm({ state: "done", res: (await r.json()) as ApiSortResponse });
    } catch {
      setLlm({ state: "error" });
    }
  }

  const item = llm.res?.ok ? llm.res.items[0] : null;
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <form onSubmit={runDevice} className="space-y-2">
        <label htmlFor={id} className="block font-bold">
          Tester une phrase
        </label>
        <textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          dir="auto"
          placeholder="had l exam ghadi yqtelni"
          className="w-full rounded-xl border border-line bg-surface-2 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
        <button type="submit" disabled={!text.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-bold text-paper disabled:opacity-40">
          <Cpu aria-hidden size={16} />
          Analyser sur le téléphone
        </button>
      </form>
      {device && (
        <ol className="enter space-y-2 text-sm" aria-label="Décision de chaque couche">
          <li className="rounded-xl bg-surface-2 p-3">
            <span className="font-bold">1. Mots-clés + modèle de sécurité :</span> {LEVEL[device.safety.level]}
            {device.safety.score !== null && <span className="text-ink-2"> · score {pct(device.safety.score)}</span>}
            {device.safety.match && <span className="text-ink-2"> · mot repéré « {device.safety.match} »</span>}
          </li>
          <li className="rounded-xl bg-surface-2 p-3">
            <span className="font-bold">2. Modèle des zones :</span> {device.zone.zone}
            {device.zone.proba && (
              <span className="text-ink-2">
                {" "}
                ·{" "}
                {Object.entries(device.zone.proba)
                  .map(([z, p]) => `${z} ${pct(p)}`)
                  .join(", ")}
              </span>
            )}
            {device.zone.by === "rules" && <span className="text-ink-2"> · règles (modèle non chargé)</span>}
          </li>
          <li className="rounded-xl bg-surface-2 p-3">
            <span className="font-bold">3. IA (gpt-oss-20b) :</span>{" "}
            {llm.state === "idle" && (
              <button type="button" onClick={runLlm} className="font-bold underline underline-offset-4">
                Demander à l&apos;IA (envoie la phrase)
              </button>
            )}
            {llm.state === "loading" && <Loader2 aria-label="L'IA répond" size={14} className="inline animate-spin motion-reduce:animate-none" />}
            {llm.state === "error" && "pas de réponse (réseau)"}
            {llm.state === "done" && !item && `pas de réponse (${llm.res && !llm.res.ok ? llm.res.error : "erreur"})`}
            {item && (
              <span>
                <Sparkles aria-hidden size={12} className="inline" /> danger {item.danger ? "oui" : "non"}, zone {item.zone} · {llm.res?.ok ? `${llm.res.model.split("/").pop()} · ${llm.res.ms} ms` : ""}
              </span>
            )}
          </li>
        </ol>
      )}
    </div>
  );
}
