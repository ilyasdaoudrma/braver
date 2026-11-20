import Link from "next/link";
import { BookOpen, Cpu, History, Loader2, Sparkles, Wind } from "lucide-react";
import type { SortCard } from "@/lib/sort/engine";
import { HelpButton } from "@/components/nav/HelpButton";
import { ActionPanel } from "./ActionPanel";
import { MoveCard } from "./MoveCard";
import { ScenarioPanel } from "./ScenarioPanel";
import { ZONE_LABEL, ZONE_STYLE } from "./zones";

export { ZONE_LABEL } from "./zones";

/** Reading card for each zone (content/cartes/<zone>.md). */
const CARD_TITLE = {
  scenario: "Une prédiction n'est pas un fait",
  action: "La plus petite étape",
  acceptation: "Ce qui ne dépend pas de toi",
} as const;

/** "1,4 s" — one decimal, rounded down. */
export function formatSeconds(ms: number): string {
  return `${(Math.floor(ms / 100) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 })} s`;
}

export function shortModel(model: string): string {
  return model.split("/").pop() ?? model;
}

function SourceBadge({
  card,
  upgrading,
}: {
  card: SortCard;
  upgrading: boolean;
}) {
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
      {upgrading ? (
        <Loader2
          aria-hidden
          size={12}
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Cpu aria-hidden size={12} />
      )}
      {upgrading ? "Sur le téléphone · l'IA affine" : "Sur le téléphone"}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-bold tracking-wide text-ink-2 uppercase">
        {label}
      </p>
      <p dir="auto">{value}</p>
    </div>
  );
}

interface SortCardViewProps {
  card: SortCard;
  upgrading: boolean;
  /** Store id of the saved worry; null until the sort is final and saved. */
  worryId: string | null;
  /** I3: "3ᵉ fois que tu écris quelque chose de proche…" (computed from the person's own data). */
  memory?: string;
}

function ZonePanel({
  card,
  worryId,
}: {
  card: SortCard;
  worryId: string | null;
}) {
  if (!worryId) {
    return (
      <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
        L&apos;IA affine ta carte, encore un instant…
      </p>
    );
  }
  if (card.zone === "scenario")
    return <ScenarioPanel card={card} worryId={worryId} />;
  if (card.zone === "action") return <ActionPanel worryId={worryId} />;
  return (
    <Link
      href="/respirer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-acceptation px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98]"
    >
      <Wind aria-hidden size={16} />
      Respirer 2 minutes
    </Link>
  );
}

export function SortCardView({ card, upgrading, worryId, memory }: SortCardViewProps) {
  const style = ZONE_STYLE[card.zone];
  return (
    <article
      className="enter relative overflow-hidden rounded-2xl border border-line bg-surface p-4 pl-5"
      aria-label={`${ZONE_LABEL[card.zone]} : ${card.text}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.chip}`}
        >
          {ZONE_LABEL[card.zone]}
        </span>
        <SourceBadge
          card={card}
          upgrading={upgrading && card.source === "device"}
        />
        {card.checking && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-2">
            Vérification
          </span>
        )}
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
      <div className="mt-4">
        <ZonePanel card={card} worryId={worryId} />
      </div>
      <Link href={`/cartes#${card.zone}`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-2 underline-offset-4 hover:underline">
        <BookOpen aria-hidden size={14} />
        À lire : {CARD_TITLE[card.zone]}
      </Link>
      <MoveCard index={card.index} zone={card.zone} disabled={!worryId} />
      {memory && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-scenario-soft p-3 text-sm text-scenario">
          <History aria-hidden size={16} className="mt-0.5 shrink-0" />
          {memory}
        </p>
      )}
      {card.distress && (
        <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-3">
          <p className="font-bold">
            Ça a l&apos;air lourd. Tu veux en parler à quelqu&apos;un ?
          </p>
          <HelpButton />
        </div>
      )}
    </article>
  );
}
