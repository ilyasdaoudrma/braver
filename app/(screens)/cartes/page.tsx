import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { parseCard, sortCards } from "@/lib/cards";

export const metadata: Metadata = { title: "À lire" };

const DIR = path.join(process.cwd(), "content", "cartes");

function loadCards() {
  return sortCards(readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => parseCard(f.replace(/\.md$/, ""), readFileSync(path.join(DIR, f), "utf-8"))));
}

const ZONE_CHIP = {
  scenario: "bg-scenario-soft text-scenario",
  action: "bg-action-soft text-action",
  acceptation: "bg-acceptation-soft text-acceptation",
  general: "bg-surface-2 text-ink-2",
} as const;

const ZONE_NAME = { scenario: "Scénario", action: "Action", acceptation: "Acceptation", general: "Pour tous" } as const;

export default function CartesPage() {
  const cards = loadCards();
  return (
    <section className="enter space-y-6" aria-labelledby="cartes-title">
      <div className="space-y-2">
        <h1 id="cartes-title" className="font-display text-3xl font-bold tracking-tight">
          À lire
        </h1>
        <p className="text-ink-2">Des cartes courtes, une idée par carte.</p>
        <p className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-ink-2">
          <BookOpen aria-hidden size={14} />
          Brouillon · à relire par un·e psychologue
        </p>
      </div>
      {cards.map((c) => (
        <article key={c.slug} id={c.slug} className="scroll-mt-20 space-y-3 rounded-2xl border border-line bg-surface p-4">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ZONE_CHIP[c.zone]}`}>{ZONE_NAME[c.zone]}</span>
          <h2 className="font-display text-xl font-bold">{c.title}</h2>
          {c.blocks.map((b, i) =>
            b.kind === "list" ? (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.items[0]}</p>
            ),
          )}
        </article>
      ))}
    </section>
  );
}
