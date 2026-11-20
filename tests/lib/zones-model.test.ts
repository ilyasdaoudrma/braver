import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import parity from "../../ml/zones/parity_cases.json";
import { predictProba, prepareModel, type CharModel } from "@/lib/charmodel";
import { isZonesModel, setZonesModelForTests, zoneOnDevice } from "@/lib/zones/model";
import { runSort } from "@/lib/sort/engine";

const raw = JSON.parse(readFileSync("public/models/zones.json", "utf-8")) as CharModel;
const model = prepareModel(raw);

describe("zone model parity with Python (ml/zones/parity_cases.json)", () => {
  it("uses the same class order", () => {
    expect(raw.classes).toEqual(parity.classes);
  });
  it.each(parity.cases as { text: string; p: number[] }[])("same probabilities: $text", ({ text, p }) => {
    const got = predictProba(model, text);
    got.forEach((x, i) => expect(Math.abs(x - p[i])).toBeLessThan(1e-6));
  });
});

describe("zoneOnDevice", () => {
  afterEach(() => setZonesModelForTests(null));

  it("validates the file strictly", () => {
    expect(isZonesModel(raw)).toBe(true);
    expect(isZonesModel({ ...raw, classes: ["scenario", "action"] })).toBe(false);
    expect(isZonesModel({ ...raw, idf: raw.idf.slice(1) })).toBe(false);
    expect(isZonesModel(null)).toBe(false);
  });

  it("uses the model when loaded (probabilities sum to 1), else the keyword rules", () => {
    const g = zoneOnDevice("Mon père a perdu son travail.", model);
    expect(g.by).toBe("model");
    expect(Object.values(g.proba!).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(zoneOnDevice("Mon père a perdu son travail.", null).by).toBe("rules");
  });

  it("a broken model falls back to the rules", () => {
    const broken = prepareModel({ ...raw, intercept: raw.intercept.map(() => Number.NaN) });
    expect(zoneOnDevice("Je dois envoyer mon CV.", broken).by).toBe("rules");
  });

  it("the on-device sort uses the loaded zone model", async () => {
    setZonesModelForTests(raw);
    const line = "Mazal ma siftsh dossier dyal la bourse.";
    const out = await runSort([line], { tone: "doux", confirmedSafe: false, forceLocal: true }, [], () => undefined, vi.fn<typeof fetch>());
    expect(out.cards[0].zone).toBe(zoneOnDevice(line, model).zone);
  });
});
