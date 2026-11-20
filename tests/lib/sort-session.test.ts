import { beforeEach, describe, expect, it } from "vitest";
import { store } from "@/lib/store";
import { clearSort, moveCard, resortConfirmed, startSort } from "@/lib/sort/session";

const LOCAL = { tone: "doux" as const, confirmedSafe: false, forceLocal: true };

// The session module keeps the current sort in memory; read it back through a subscription-free trick:
// startSort returns the on-device outcome, and the store shows what was saved.
describe("sort session (on-device, forceLocal)", () => {
  beforeEach(() => {
    clearSort();
    store.wipe();
  });

  it("saves one worry per card with stable ids", () => {
    const out = startSort(["Je n'ai toujours pas envoyé mon dossier de stage.", "Mon père a perdu son travail."], LOCAL);
    expect(out.alert).toBeNull();
    const worries = store.get("worries");
    expect(worries).toHaveLength(2);
    expect(new Set(worries.map((w) => w.id)).size).toBe(2);
  });

  it("moveCard changes the saved zone and keeps where it came from", () => {
    startSort(["Mon père a perdu son travail."], LOCAL);
    const before = store.get("worries")[0];
    const target = before.zone === "action" ? "scenario" : "action";
    moveCard(0, target);
    const after = store.get("worries")[0];
    expect(after.zone).toBe(target);
    expect(after.movedFrom).toBe(before.zone);
    moveCard(0, before.zone);
    expect(store.get("worries")[0].movedFrom).toBe(before.zone);
  });

  it("an alert saves nothing; 'On s'est mal compris' re-runs the same lines with confirmedSafe", () => {
    const out = startSort(["bghit nmout", "Mazal ma siftsh dossier dyal stage."], LOCAL);
    expect(out.alert?.source).toBe("keywords");
    expect(store.get("worries")).toHaveLength(0);
    // forceLocal + confirmedSafe: the danger keyword becomes a doubt the LLM would check;
    // confirmedSafe means the person told us it was a misunderstanding, so the cards are shown.
    expect(resortConfirmed()).toBe(true);
    expect(store.get("worries")).toHaveLength(2);
  });

  it("resortConfirmed does nothing without an alert", () => {
    startSort(["Mon père a perdu son travail."], LOCAL);
    expect(resortConfirmed()).toBe(false);
  });
});
