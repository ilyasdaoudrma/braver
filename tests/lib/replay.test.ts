import { describe, expect, it, vi } from "vitest";
import { addDays, calibration, fetchComment, groupEntries, localComment, makeEntry, worstSentence } from "@/lib/replay";
import { hasForbidden } from "@/lib/guards";
import type { ReplayEntry, WorstHappened } from "@/lib/types";

const NOW = new Date(2026, 10, 20, 9, 0, 0);

function entry(over: Partial<ReplayEntry> = {}): ReplayEntry {
  return {
    ...makeEntry({ id: "x", worryId: null, text: "t", prediction: "Je vais rater.", question: null, certainty: 80, days: 1 }, NOW),
    ...over,
  };
}

function done(certainty: number, worst: WorstHappened): ReplayEntry {
  return entry({ id: `${certainty}-${worst}-${Math.random()}`, certainty, status: "done", worstHappened: worst, outcome: "ok" });
}

describe("dates", () => {
  it("adds calendar days across a month end", () => {
    expect(addDays(new Date(2026, 10, 29), 3)).toBe("2026-12-02");
  });
  it("makeEntry clamps certainty and sets the check date", () => {
    const e = makeEntry({ id: "a", worryId: "w", text: "t", prediction: "p", question: "q", certainty: 140, days: 7 }, NOW);
    expect(e).toMatchObject({ certainty: 100, checkAt: "2026-11-27", status: "pending", outcome: null });
  });
});

describe("groupEntries", () => {
  it("splits due, later and done", () => {
    const g = groupEntries(
      [entry({ id: "late", checkAt: "2026-11-25" }), entry({ id: "due", checkAt: "2026-11-19" }), done(50, "non")],
      "2026-11-20",
    );
    expect(g.due.map((e) => e.id)).toEqual(["due"]);
    expect(g.later.map((e) => e.id)).toEqual(["late"]);
    expect(g.done).toHaveLength(1);
  });
});

describe("calibration (computed from the person's own entries)", () => {
  it("counts exact numbers per certainty bucket", () => {
    const c = calibration([done(90, "non"), done(85, "oui"), done(100, "non"), done(30, "en_partie"), entry()]);
    expect(c).toMatchObject({ n: 4, worst: 1, partly: 1 });
    const top = c.buckets[4];
    expect(top).toMatchObject({ from: 80, to: 100, n: 3, worst: 1 });
    expect(top.meanCertainty).toBeCloseTo(91.6667, 3);
    expect(c.buckets[1]).toMatchObject({ n: 1, partly: 1 });
    expect(c.buckets[0].meanCertainty).toBeNull();
  });
  it("says exact counts, never a percentage", () => {
    expect(worstSentence({ n: 8, worst: 1, partly: 0 })).toBe("Sur tes 8 prédictions vérifiées, le pire est arrivé 1 fois sur 8.");
    expect(worstSentence({ n: 1, worst: 0, partly: 1 })).toBe("Sur ta prédiction vérifiée, le pire est arrivé 0 fois sur 1, en partie 1 fois.");
    expect(worstSentence({ n: 0, worst: 0, partly: 0 })).toBeNull();
  });
});

describe("comments", () => {
  it("local comments contain no forbidden reassurance and no invented number", () => {
    for (const w of ["oui", "non", "en_partie"] as const) {
      const c = localComment({ prediction: "Je vais rater.", certainty: 80 }, w);
      expect(hasForbidden(c)).toBe(false);
      expect(c.replace("80 %", "")).not.toMatch(/\d/);
    }
  });

  it("uses the LLM comment when it answers, guarded", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, model: "openai/gpt-oss-20b", ms: 400, comment: "Ne t'inquiète pas. Tu avais prévu un échec, ça ne s'est pas passé." }),
    });
    const r = await fetchComment(entry(), "J'ai eu 14.", "non", fetchImpl as unknown as typeof fetch);
    expect(r.source).toBe("llm");
    expect(r.comment).toBe("Tu avais prévu un échec, ça ne s'est pas passé.");
  });

  it("falls back to the local comment when the network fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
    const r = await fetchComment(entry(), "J'ai eu 14.", "non", fetchImpl as unknown as typeof fetch);
    expect(r).toMatchObject({ source: "device", model: null });
    expect(r.comment).toContain("Ce n'est pas ce qui s'est passé");
  });

  it("falls back when the API returns an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ ok: false, error: "llm_failed" }) });
    const r = await fetchComment(entry(), "x", "oui", fetchImpl as unknown as typeof fetch);
    expect(r.source).toBe("device");
  });
});
