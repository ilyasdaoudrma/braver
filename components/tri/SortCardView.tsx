import { Cpu, Loader2, Sparkles } from "lucide-react";
import type { SortCard } from "@/lib/sort/engine";
import type { Zone } from "@/lib/types";
import { HelpButton } from "@/components/nav/HelpButton";

export const ZONE_LABEL: Record<Zone, string> = { scenario: "Scénario", action: "Action", acceptation: "Acceptation" };

const ZONE_STYLE: Record<Zone, { bar: string; chip: string }> = {
  scenario: { bar: "bg-scenario", chip: "bg-scenario-soft text-scenario" },
  action: { bar: "bg-action", chip: "bg-action-soft text-action" },
  acceptation: { bar: "bg-acceptation", chip: "bg-acceptation-soft text-acceptation" },
};

/** "1,4 s" — one decimal, rounded down. */
export function formatSeconds(ms: number): string {
  return `${(Math.floor(ms / 100) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 })} s`;
}

export function shortModel(model: string): string {
  return model.split("/").pop() ?? model;
}

function SourceBadge({ card, upgrading }: { card: SortCard; upgrading: boolean }) {
  if (card.source === "llm" && card.model) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-2">
        <Sparkles aria-hidden size={12} />
        IA · {shortModel(card.model)}
        {card.ms !== null && ` · ${formatSeconds(card.ms)}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-2">
      {upgrading ? <Loader2 aria-hidden size={12} className="animate-spin motion-reduce:animate-none" /> : <Cpu aria-hidden size={12} />}
      {upgrading ? "Sur le téléphone · l'IA affine" : "Sur le téléphone"}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-bold tracking-wide text-ink-2 uppercase">{label}</p>
      <p dir="auto">{value}</p>
    </div>
  );
}

export function SortCardView({ card, upgrading }: { card: SortCard; upgrading: boolean }) {
  const style = ZONE_STYLE[card.zone];
  return (
    <article className="enter relative overflow-hidden rounded-2xl border border-line bg-surface p-4 pl-5" aria-label={`${ZONE_LABEL[card.zone]} : ${card.text}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.chip}`}>{ZONE_LABEL[card.zone]}</span>
        <SourceBadge card={card} upgrading={upgrading && card.source === "device"} />
        {card.checking && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-2">Vérification</span>}
      </div>
      <p dir="auto" className="mb-3 font-bold">
        {card.text}
      </p>
      <div className="space-y-3 text-[0.95rem]">
        <p className="text-ink-2">{card.why}</p>
        <Field label="Ta prédiction" value={card.prediction} />
        <Field label="Pour vérifier" value={card.question} />
        <Field label="Une petite étape" value={card.step} />
        <Field label="Ce que tu vis" value={card.validation} />
        <Field label="Ce qui reste à toi" value={card.control} />
      </div>
      {card.distress && (
        <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-3">
          <p className="font-bold">Ça a l&apos;air lourd. Tu veux en parler à quelqu&apos;un ?</p>
          <HelpButton />
        </div>
      )}
    </article>
  );
}
