import { beforeEach, describe, expect, it } from "vitest";
import { dashboard, inPeriod } from "@/lib/dashboard";
import { clearDemo, demoData, loadDemo } from "@/lib/demo";
import { store } from "@/lib/store";
import { hasForbidden } from "@/lib/guards";

const NOW = new Date(2026, 10, 20, 12, 0, 0);

describe("demo data (fictional, labelled)", () => {
  it("is deterministic and every item is marked demo", () => {
    const a = demoData(NOW);
    const b = demoData(NOW);
    expect(a).toEqual(b);
    for (const list of Object.values(a))
      for (const item of list as { demo?: boolean }[])
        expect(item.demo).toBe(true);
    expect(a.moods).toHaveLength(30);
    expect(
      a.gad7.every((g) => g.answers.reduce((s, x) => s + x, 0) === g.score),
    ).toBe(true);
  });

  it("contains no forbidden reassurance", () => {
    const d = demoData(NOW);
    const texts = [
      ...d.worries.map((w) => w.text),
      ...d.worries.map((w) => w.step ?? ""),
      ...d.replays.map((r) => `${r.prediction} ${r.outcome ?? ""}`),
    ];
    expect(texts.filter(hasForbidden)).toEqual([]);
  });

  describe("load / clear", () => {
    beforeEach(() => store.wipe());
    it("keeps the person's own items and removes only demo items", () => {
      store.set("moods", [
        { id: "mine", at: NOW.toISOString(), level: 3, emotions: [] },
      ]);
      loadDemo(store, NOW);
      loadDemo(store, NOW); // twice: no duplicates
      expect(store.get("moods")).toHaveLength(31);
      expect(store.get("settings").demo).toBe(true);
      clearDemo(store);
      expect(store.get("moods").map((m) => m.id)).toEqual(["mine"]);
      expect(store.get("settings").demo).toBe(false);
    });
  });
});

describe("dashboard", () => {
  const d = demoData(NOW);

  it("filters by period", () => {
    expect(
      inPeriod(new Date(NOW.getTime() - 3_600_000).toISOString(), "24h", NOW),
    ).toBe(true);
    expect(
      inPeriod(
        new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
        "24h",
        NOW,
      ),
    ).toBe(false);
    expect(inPeriod(null, "30j", NOW)).toBe(false);
    expect(dashboard(d, "30j", NOW).moods).toHaveLength(30);
    expect(dashboard(d, "7j", NOW).moods.length).toBeLessThan(10);
  });

  it("counts zones, steps, breathing and keeps GAD-7 as scores only", () => {
    const m = dashboard(d, "30j", NOW);
    expect(m.zones.scenario + m.zones.action + m.zones.acceptation).toBe(
      m.worries,
    );
    expect(m.stepsDone).toBe(4);
    expect(m.breathing.sessions).toBe(9);
    expect(m.breathing.better).toBeLessThanOrEqual(m.breathing.rated);
    expect(m.gad7.map((g) => g.score)).toEqual([14, 12, 11, 9]);
    expect(m.calibration.n).toBe(7);
    expect(m.hasDemo).toBe(true);
  });

  it("empty data gives zeros and nulls", () => {
    const m = dashboard(
      { moods: [], worries: [], replays: [], breathing: [], gad7: [] },
      "7j",
      NOW,
    );
    expect(m).toMatchObject({
      moodMean: null,
      worries: 0,
      stepsDone: 0,
      hasDemo: false,
    });
  });
});
