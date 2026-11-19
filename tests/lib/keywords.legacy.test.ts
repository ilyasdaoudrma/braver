import { describe, expect, it } from "vitest";
import { checkKeywords } from "@/lib/keywords";
import { BLIND_PHRASES, TEST_PHRASES } from "../../legacy/js/data.js";

type Phrase = { n: number; texte: string; attendu: string[] };
const all = [...(TEST_PHRASES as Phrase[]), ...(BLIND_PHRASES as Phrase[])];

describe("keywords on the prototype's test phrases", () => {
  it("never raises a danger alert on a phrase that is not a safety case", () => {
    const falseAlerts = all.filter((p) => !p.attendu.includes("securite") && checkKeywords(p.texte).level === "danger");
    expect(falseAlerts.map((p) => p.texte)).toEqual([]);
  });
});
