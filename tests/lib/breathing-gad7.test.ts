import { describe, expect, it } from "vitest";
import { BREATHING_CLAIM, breathAt, CYCLE, CYCLE_MS } from "@/lib/breathing";
import { GAD7_ANSWERS, GAD7_QUESTIONS, gad7Score, trendText } from "@/lib/gad7";

describe("cyclic sighing timing", () => {
  it("goes inhale → second inhale → long exhale, then repeats", () => {
    expect(breathAt(0, 120).phase.phase).toBe("inspire");
    expect(breathAt(2600, 120).phase.phase).toBe("reinspire");
    expect(breathAt(4000, 120).phase.phase).toBe("expire");
    expect(breathAt(CYCLE_MS + 10, 120)).toMatchObject({ cycle: 1, index: 0 });
  });
  it("the exhale is longer than both inhales together", () => {
    const [a, b, c] = CYCLE;
    expect(c.ms).toBeGreaterThan(a.ms + b.ms);
  });
  it("ends after the chosen duration", () => {
    expect(breathAt(119_999, 120).done).toBe(false);
    expect(breathAt(120_000, 120).done).toBe(true);
  });
  it("claims only what CLAUDE.md allows", () => {
    expect(BREATHING_CLAIM).toContain("Stanford, 2023");
    expect(BREATHING_CLAIM.toLowerCase()).not.toContain("cortisol");
  });
});

describe("GAD-7", () => {
  it("has 7 questions and 4 answers", () => {
    expect(GAD7_QUESTIONS).toHaveLength(7);
    expect(GAD7_ANSWERS.map((a) => a.value)).toEqual([0, 1, 2, 3]);
  });
  it("scores 0–21 and refuses incomplete answers", () => {
    expect(gad7Score([0, 0, 0, 0, 0, 0, 0])).toBe(0);
    expect(gad7Score([3, 3, 3, 3, 3, 3, 3])).toBe(21);
    expect(() => gad7Score([1, 2])).toThrow();
    expect(() => gad7Score([0, 0, 0, 0, 0, 0, 4])).toThrow();
  });
  it("describes the trend without any label", () => {
    expect(trendText([12])).toBeNull();
    expect(trendText([12, 9])).toBe("3 points de moins que la dernière fois.");
    expect(trendText([9, 10])).toBe("1 point de plus que la dernière fois.");
    expect(trendText([9, 9])).toBe("Même score que la dernière fois (9).");
  });
});
