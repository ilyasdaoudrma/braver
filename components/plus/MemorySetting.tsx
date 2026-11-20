"use client";
import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { EMBED_DOWNLOAD_MB, loadEmbedder } from "@/lib/memory/embed";
import { indexWorries } from "@/lib/memory/use-memory";
import { useStoreValue } from "@/lib/use-store";

type State = { kind: "idle" } | { kind: "loading"; percent: number } | { kind: "error" };

/** I3: opt-in memory. The model is downloaded only after this switch is turned on. */
export function MemorySetting() {
  const [settings, updateSettings] = useStoreValue("settings");
  const [, updateEmbeddings] = useStoreValue("embeddings");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function turnOn() {
    setState({ kind: "loading", percent: 0 });
    try {
      await loadEmbedder((p) => setState({ kind: "loading", percent: Math.floor(p) }));
      if (!(await indexWorries())) throw new Error("index");
      updateSettings((s) => ({ ...s, memory: true }));
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error" });
    }
  }

  function turnOff() {
    updateSettings((s) => ({ ...s, memory: false }));
    updateEmbeddings(() => []); // the vectors are deleted with the setting
  }

  return (
    <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 font-bold">
        <BrainCircuit aria-hidden size={18} />
        Mémoire de tes inquiétudes
      </p>
      <p className="text-sm text-ink-2">
        Reconnaît une inquiétude déjà écrite et rappelle ce que ton Replay en dit. Tout reste sur ce téléphone, mais un modèle de {EMBED_DOWNLOAD_MB} Mo est
        téléchargé une fois (de préférence en Wi-Fi).
      </p>
      {settings.memory ? (
        <button type="button" onClick={turnOff} className="min-h-11 rounded-full border border-ink/20 px-4 font-bold">
          Désactiver et effacer la mémoire
        </button>
      ) : state.kind === "loading" ? (
        <p role="status" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">
          <Loader2 aria-hidden size={16} className="animate-spin motion-reduce:animate-none" />
          Téléchargement du modèle… {state.percent} %
        </p>
      ) : (
        <>
          <button type="button" onClick={turnOn} className="min-h-11 rounded-full bg-ink px-4 font-bold text-paper">
            Activer la mémoire ({EMBED_DOWNLOAD_MB} Mo)
          </button>
          {state.kind === "error" && (
            <p role="alert" className="text-sm text-danger">
              Le modèle n&apos;a pas pu être chargé (connexion ?). Réessaie plus tard ; le tri marche sans.
            </p>
          )}
        </>
      )}
    </div>
  );
}
