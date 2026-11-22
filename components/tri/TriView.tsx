"use client";
import Link from "next/link";
import { CloudOff, Cpu, KeyRound, PenLine, Sparkles } from "lucide-react";
import { useSortSession } from "@/lib/sort/session";
import { useMemoryLines } from "@/lib/memory/use-memory";
import type { SortOutcome } from "@/lib/sort/engine";
import { ZONES } from "@/lib/types";
import {
  formatSeconds,
  shortModel,
  SortCardView,
  ZONE_LABEL,
} from "./SortCardView";

function EngineFooter({
  outcome,
  upgrading,
}: {
  outcome: SortOutcome;
  upgrading: boolean;
}) {
  let icon = <Cpu aria-hidden size={16} />;
  let text = "Tri fait sur ton téléphone.";
  if (upgrading) text = "Tri fait sur ton téléphone. L'IA affine tes cartes…";
  else if (outcome.engine === "llm" && outcome.model) {
    icon = <Sparkles aria-hidden size={16} />;
    text = `Tri affiné par ${shortModel(outcome.model)}${outcome.ms !== null ? ` en ${formatSeconds(outcome.ms)}` : ""}.`;
  } else if (outcome.failure === "no_key") {
    return (
      <p role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
        <Cpu aria-hidden size={16} />
        Tri fait sur ton téléphone.
        <Link href="/plus" className="inline-flex items-center gap-1 font-bold text-focus underline-offset-4 hover:underline">
          <KeyRound aria-hidden size={14} />
          Ajoute ta clé d&apos;IA pour un tri plus fin
        </Link>
      </p>
    );
  } else if (outcome.failure === "key_rejected") {
    icon = <KeyRound aria-hidden size={16} />;
    text = "Ta clé d'IA a été refusée (vérifie-la dans Plus) : tri fait sur ton téléphone.";
  } else if (outcome.failure) {
    icon = <CloudOff aria-hidden size={16} />;
    text = "L'IA n'a pas répondu : tri fait sur ton téléphone.";
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-ink-2"
    >
      {icon}
      {text}
    </p>
  );
}

export function TriView() {
  const session = useSortSession();
  const memory = useMemoryLines(session?.saved ? session.worryIds : []);
  const alert = session?.outcome.alert;

  // An alert is handled by SortAlertWatcher (it opens the safety screen); no cards are shown.
  if (!session || alert) {
    return (
      <section className="enter space-y-4 rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
        <p className="font-bold">Rien à trier pour l&apos;instant</p>
        <p className="text-ink-2">Écris d&apos;abord ce qui t&apos;inquiète.</p>
        <Link
          href="/vider"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-bold text-paper"
        >
          <PenLine aria-hidden size={16} />
          Vider ma tête
        </Link>
      </section>
    );
  }

  const { outcome, upgrading } = session;
  return (
    <section className="space-y-6" aria-labelledby="tri-title">
      <div className="space-y-2">
        <h1
          id="tri-title"
          className="font-display text-4xl font-light tracking-tight"
        >
          Ton tri
        </h1>
        <EngineFooter outcome={outcome} upgrading={upgrading} />
      </div>
      {ZONES.map((zone) => {
        const cards = outcome.cards.filter((c) => c.zone === zone);
        if (!cards.length) return null;
        return (
          <div key={zone} className="space-y-3">
            <h2 className="font-display text-xl font-semibold">
              {ZONE_LABEL[zone]}{" "}
              <span className="text-ink-2">· {cards.length}</span>
            </h2>
            {cards.map((card) => (
              <SortCardView
                key={card.index}
                card={card}
                upgrading={upgrading}
                worryId={session.saved ? session.worryIds[card.index] : null}
                memory={session.saved ? memory[session.worryIds[card.index]] : undefined}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
