import { describe, expect, it, vi } from "vitest";
import { sortRequestSchema } from "@/lib/sort/api";
import type { groqJSON } from "@/lib/groq";
import { buildSortUser, localReplayComment, runReplay, runSort } from "@/lib/server/sort";
import { deviceZone } from "@/lib/sort/rules";

const input = sortRequestSchema.parse({
  worries: [{ text: "Je vais rater mon exposé." }, { text: "Mazal ma siftsh dossier.", seen: 2 }],
  tone: "direct",
});

const raw = (n: number, over: Record<string, unknown> = {}) => ({
  n,
  danger: false,
  detresse: false,
  zone: "scenario",
  pourquoi: "C'est une prédiction.",
  prediction: "Tu prédis un échec.",
  question: "Qu'est-ce qui te le prouve ?",
  petite_etape: "Fais ceci.",
  validation: null,
  controle: null,
  ...over,
});

function fakeGroq(data: unknown): typeof groqJSON {
  return vi.fn(async () => ({ data, model: "openai/gpt-oss-20b", ms: 512 })) as unknown as typeof groqJSON;
}

describe("buildSortUser", () => {
  it("numbers the lines, marks repeats, and sends the tone", () => {
    expect(buildSortUser(input)).toBe("Ton : direct\nInquiétudes :\n1. Je vais rater mon exposé.\n2. Mazal ma siftsh dossier.  (déjà écrite 2 fois)");
  });

  it("adds the confirmed-safe note only when asked", () => {
    expect(buildSortUser({ ...input, confirmedSafe: true })).toContain("On s'est mal compris");
  });
});

describe("runSort (server)", () => {
  it("keeps only the fields of the zone, guards reassurance, drops duplicates and unknown lines", async () => {
    const data = {
      inquietudes: [
        raw(1, { question: "Ne t'inquiète pas, tout ira bien." }),
        raw(1, { zone: "action" }),
        raw(2, { zone: "action", pourquoi: "Tu exagères.", prediction: "x" }),
        raw(9),
      ],
    };
    const res = await runSort(input, fakeGroq(data));
    expect(res.items.map((i) => [i.n, i.zone])).toEqual([
      [1, "scenario"],
      [2, "action"],
    ]);
    expect(res.items[0].step).toBeNull();
    expect(res.items[0].question).not.toMatch(/inqui/);
    expect(res.items[1].prediction).toBeNull();
    expect(res.items[1].step).toBe("Fais ceci.");
    expect(res.items[1].why).not.toMatch(/exag/);
    expect(res.corrections.length).toBeGreaterThanOrEqual(2);
    expect(res.model).toBe("openai/gpt-oss-20b");
  });

  it("fills an empty zone field from the on-device texts", async () => {
    const res = await runSort(input, fakeGroq({ inquietudes: [raw(2, { zone: "action", petite_etape: null })] }));
    expect(res.items[0].step).toBeTruthy();
  });

  it("passes danger and distress through", async () => {
    const res = await runSort(input, fakeGroq({ inquietudes: [raw(1, { danger: true, detresse: true })] }));
    expect(res.items[0]).toMatchObject({ danger: true, distress: true });
  });
});

describe("replay", () => {
  it("falls back to the local comment when the LLM reassures", async () => {
    const res = await runReplay(
      { prediction: "p", outcome: "o", certainty: 90, worstHappened: "non" },
      fakeGroq({ commentaire: "Tout ira bien !" }),
    );
    expect(res.comment).toBe(localReplayComment({ certainty: 90, worstHappened: "non" }));
  });
});

describe("deviceZone (interim rules)", () => {
  it.each([
    ["Je vais rater mon entretien demain, j'en suis sûr.", "scenario"],
    ["Je n'ai toujours pas envoyé mon dossier de stage.", "action"],
    ["Ma grand-mère est décédée la semaine dernière.", "acceptation"],
    ["Bba khrjouh mn lkhedma.", "acceptation"],
  ])("%s → %s", (text, zone) => {
    expect(deviceZone(text).zone).toBe(zone);
  });
});
