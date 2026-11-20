import { describe, expect, it } from "vitest";
import { cosine, memoryLine, similarWorries, summarize } from "@/lib/memory/memory";
import { hasForbidden } from "@/lib/guards";
import type { ReplayEntry, Worry } from "@/lib/types";

const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
const worry = (id: string, demo = false): Worry => ({ id, text: id, zone: "scenario", createdAt: "x", source: "llm", model: null, movedFrom: null, step: null, fearBefore: null, doneAt: null, demo });
const replay = (worryId: string, worst: "oui" | "non", demo = false): ReplayEntry => ({ id: `r-${worryId}`, worryId, text: "t", prediction: "p", question: null, certainty: 80, checkAt: "2026-11-01", createdAt: "x", status: "done", outcome: "o", worstHappened: worst, comment: null, commentSource: null, demo });

describe("memory", () => {
  it("cosine of normalised vectors", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 0])).toBe(0);
  });

  it("keeps the k most similar above the bar, skips excluded ids and other models", () => {
    const q = unit([1, 0.1]);
    const entries = [
      { worryId: "a", model: "m", vector: unit([1, 0.12]) },
      { worryId: "b", model: "m", vector: unit([1, 0.15]) },
      { worryId: "c", model: "m", vector: unit([0, 1]) },
      { worryId: "d", model: "other", vector: unit([1, 0.1]) },
      { worryId: "self", model: "m", vector: q },
    ];
    const s = similarWorries(q, entries, { exclude: new Set(["self"]), model: "m" });
    expect(s.map((x) => x.worryId)).toEqual(["a", "b"]);
  });

  it("counts only the person's own worries and checked predictions, exactly", () => {
    const sim = [{ worryId: "a", score: 0.95 }, { worryId: "b", score: 0.93 }, { worryId: "demo", score: 0.9 }];
    const m = summarize(sim, [worry("a"), worry("b"), worry("demo", true)], [replay("a", "non"), replay("b", "oui"), replay("demo", "oui", true)]);
    expect(m).toEqual({ similar: 2, checked: 2, worst: 1 });
    expect(memoryLine(m)).toBe("3ᵉ fois que tu écris quelque chose de proche. Sur les 2 prédictions vérifiées, le pire est arrivé 1 fois sur 2.");
    expect(memoryLine({ similar: 1, checked: 0, worst: 0 })).toBe("2ᵉ fois que tu écris quelque chose de proche.");
    expect(memoryLine({ similar: 0, checked: 0, worst: 0 })).toBeNull();
    expect(hasForbidden(memoryLine(m))).toBe(false);
  });
});
