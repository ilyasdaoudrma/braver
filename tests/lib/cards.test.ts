import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCard, sortCards } from "@/lib/cards";
import { hasForbidden } from "@/lib/guards";

const files = readdirSync("content/cartes").filter((f) => f.endsWith(".md"));
const cards = files.map((f) => parseCard(f.replace(".md", ""), readFileSync(`content/cartes/${f}`, "utf-8")));

describe("reading cards", () => {
  it("has 6–8 cards, one per zone at least", () => {
    expect(cards.length).toBeGreaterThanOrEqual(6);
    expect(cards.length).toBeLessThanOrEqual(8);
    for (const z of ["scenario", "action", "acceptation"]) expect(cards.some((c) => c.zone === z)).toBe(true);
  });
  it("contain no forbidden reassurance, no cortisol claim, no diagnosis word", () => {
    for (const c of cards) {
      const text = [c.title, ...c.blocks.flatMap((b) => b.items)].join(" ");
      expect(hasForbidden(text), c.slug).toBe(false);
      expect(text.toLowerCase()).not.toMatch(/cortisol|trouble anxieux|dépression|tdah/);
    }
  });
  it("parses lists and paragraphs, sorts zones first", () => {
    const c = parseCard("x", "---\ntitle: T\nzone: action\n---\nUn.\n\n- a\n- b");
    expect(c.blocks).toEqual([{ kind: "p", items: ["Un."] }, { kind: "list", items: ["a", "b"] }]);
    expect(sortCards(cards)[0].zone).toBe("scenario");
    expect(() => parseCard("y", "no front matter")).toThrow();
  });
});
