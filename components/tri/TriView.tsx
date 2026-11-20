"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudOff, Cpu, PenLine, Sparkles } from "lucide-react";
import { useSortSession } from "@/lib/sort/session";
import type { SortOutcome } from "@/lib/sort/engine";
import { ZONES } from "@/lib/types";
import { formatSeconds, shortModel, SortCardView, ZONE_LABEL } from "./SortCardView";

function EngineFooter({ outcome, upgrading }: { outcome: SortOutcome; upgrading: boolean }) {
  let icon = <Cpu aria-hidden size={16} />;
  let text = "Tri fait sur ton téléphone.";
  if (upgrading) text = "Tri fait sur ton téléphone. L'IA affine tes cartes…";
  else if (outcome.engine === "llm" && outcome.model) {
    icon = <Sparkles aria-hidden size={16} />;
    text = `Tri affiné par ${shortModel(outcome.model)}${outcome.ms !== null ? ` en ${formatSeconds(outcome.ms)}` : ""}.`;
  } else if (outcome.failure) {
    icon = <CloudOff aria-hidden size={16} />;
    text = "L'IA n'a pas répondu : tri fait sur ton téléphone.";
  }
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-ink-2">
      {icon}
      {text}
    </p>
  );
}

export function TriView() {
  const router = useRouter();
  const session = useSortSession();
  const alert = session?.outcome.alert;

  useEffect(() => {
    if (alert) router.replace("/securite");
  }, [alert, router]);

  if (!session || alert) {
    return (
      <section className="enter space-y-4 rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
        <p className="font-bold">Rien à trier pour l&apos;instant</p>
        <p className="text-ink-2">Écris d&apos;abord ce qui t&apos;inquiète.</p>
        <Link href="/vider" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-bold text-paper">
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
        <h1 id="tri-title" className="font-display text-3xl font-bold tracking-tight">
          Ton tri
        </h1>
        <EngineFooter outcome={outcome} upgrading={upgrading} />
      </div>
      {ZONES.map((zone) => {
        const cards = outcome.cards.filter((c) => c.zone === zone);
        if (!cards.length) return null;
        return (
          <div key={zone} className="space-y-3">
            <h2 className="font-display text-xl font-bold">
              {ZONE_LABEL[zone]} <span className="text-ink-2">· {cards.length}</span>
            </h2>
            {cards.map((card) => (
              <SortCardView key={card.index} card={card} upgrading={upgrading} />
            ))}
          </div>
        );
      })}
    </section>
  );
}
