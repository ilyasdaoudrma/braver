// Reading cards (content/cartes/*.md). Tiny format: a front matter (title, zone), paragraphs, "- " list items.
// Parsed to plain data and rendered as text (no HTML injection).
import type { Zone } from "./types";

export type CardZone = Zone | "general";

export interface CardBlock {
  kind: "p" | "list";
  items: string[];
}

export interface ReadingCard {
  slug: string;
  title: string;
  zone: CardZone;
  blocks: CardBlock[];
}

const ZONES: readonly CardZone[] = ["scenario", "action", "acceptation", "general"];

export function parseCard(slug: string, raw: string): ReadingCard {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`card ${slug}: missing front matter`);
  const meta = Object.fromEntries(
    m[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const zone = meta.zone as CardZone;
  if (!meta.title || !ZONES.includes(zone)) throw new Error(`card ${slug}: bad title or zone`);
  const blocks: CardBlock[] = m[2]
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((l) => l.trim());
      return lines.every((l) => l.startsWith("- "))
        ? { kind: "list" as const, items: lines.map((l) => l.slice(2)) }
        : { kind: "p" as const, items: [lines.join(" ")] };
    });
  return { slug, title: meta.title, zone, blocks };
}

/** Order on the page: the three zones first, then the general cards. */
export function sortCards(cards: readonly ReadingCard[]): ReadingCard[] {
  return [...cards].sort((a, b) => ZONES.indexOf(a.zone) - ZONES.indexOf(b.zone) || a.title.localeCompare(b.title, "fr"));
}
