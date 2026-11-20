import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import cases from "../../ml/safety/parity_cases.json";
import { charWbNgrams, predictProba, prepareModel } from "@/lib/charmodel";
import { checkSafety, type SafetyModel } from "@/lib/safety/pipeline";
import { normalize } from "@/lib/text";
import { isSafetyModel, setSafetyModelForTests } from "@/lib/safety/model";
import { runSort } from "@/lib/sort/engine";

const model = prepareModel(JSON.parse(readFileSync("public/models/safety.json", "utf-8")) as SafetyModel);

describe("safety model parity with Python (ml/safety/parity_cases.json)", () => {
  it("has 50 cases", () => {
    expect(cases).toHaveLength(50);
  });
  it.each(cases as { text: string; p: number }[])("same probability: $text", ({ text, p }) => {
    expect(Math.abs(predictProba(model, text)[1] - p)).toBeLessThan(1e-6);
  });
  it("char_wb n-grams handle short words like sklearn (one n-gram per too-short word)", () => {
    expect(charWbNgrams(normalize("a"), 2, 5)).toEqual([" a", "a ", " a "]);
  });
});

describe("safety pipeline (keywords → model → LLM band)", () => {
  const level = (t: string) => checkSafety(t, model).level;

  it("explicit danger alerts on the device (CLAUDE.md)", () => {
    for (const t of ["bghit nmout", "ma bqitch baghi nfi9 sbah", "kayderbni", "Je veux mourir.", "ما بقيتش بغيت نعيش"]) {
      expect(level(t)).toBe("danger");
    }
  });

  it("figurative stress does not alert (CLAUDE.md)", () => {
    expect(level("Ce partiel va me tuer")).toBe("none");
    expect(level("cette chaleur va me tuer")).toBe("none");
  });

  it("an ambiguous word is cleared only when the score is far below the threshold, otherwise the LLM decides", () => {
    const t = "had l exam ghadi yqtelni";
    const score = predictProba(model, t)[1];
    // threshold = 1.5 × score puts the score between threshold × 0.5 and the threshold: the LLM must decide.
    const between = { ...model, model: { ...model.model, threshold: score * 1.5, high: 0.999 } };
    expect(checkSafety(t, between)).toMatchObject({ level: "check", by: "keywords+model" });
    // far below the threshold: cleared on the device
    const far = { ...model, model: { ...model.model, threshold: Math.min(0.99, score * 2.5), high: 0.999 } };
    expect(checkSafety(t, far).level).toBe("none");
  });

  it("a broken model (NaN weights) never clears an ambiguous word", () => {
    const broken = prepareModel({ ...model.model, intercept: [Number.NaN] });
    expect(checkSafety("Ce partiel va me tuer", broken)).toMatchObject({ level: "check", score: null });
  });

  it("rejects truncated or corrupted model files", () => {
    expect(isSafetyModel(model.model)).toBe(true);
    expect(isSafetyModel({ ...model.model, idf: model.model.idf.slice(1) })).toBe(false);
    expect(isSafetyModel({ ...model.model, coef: [[...model.model.coef[0].slice(1), Number.NaN]] })).toBe(false);
    expect(isSafetyModel({ ...model.model, threshold: 0.9, high: 0.5 })).toBe(false);
    expect(isSafetyModel(null)).toBe(false);
  });

  it("hopelessness gives the gentle check-in, not an alert", () => {
    expect(level("ma bqitch nchouf l9ima dyal rasi")).toBe("hopeless");
  });

  it("a score in the ambiguous band asks the LLM", () => {
    const m = { ...model, model: { ...model.model, threshold: 0, high: 1.01 } };
    expect(checkSafety("Mon père va me tuer s'il voit mes notes", m)).toMatchObject({ level: "check", by: "keywords+model" });
  });

  it("without the model an ambiguous word asks the LLM (offline → alert)", () => {
    expect(checkSafety("Ce partiel va me tuer", null)).toMatchObject({ level: "check", by: "keywords", score: null });
    expect(checkSafety("Mazal ma siftsh dossier dyal stage.", null).level).toBe("none");
  });

  it("everyday worries stay below the threshold", () => {
    for (const t of ["Mazal ma siftsh dossier dyal stage.", "Je vais rater mon entretien demain"]) expect(level(t)).toBe("none");
  });
});

describe("sort engine with the trained model loaded", () => {
  const opts = { tone: "doux" as const, confirmedSafe: false, forceLocal: true };

  afterEach(() => setSafetyModelForTests(null));

  it("offline, the model clears a figurative 'me tuer' instead of alerting", async () => {
    setSafetyModelForTests(model.model);
    const out = await runSort(["Ce partiel va me tuer, j'ai rien révisé"], opts, [], () => undefined, vi.fn<typeof fetch>());
    expect(out.alert).toBeNull();
    expect(out.cards).toHaveLength(1);
  });

  it("without the model the same line still alerts offline (safety first)", async () => {
    const out = await runSort(["Ce partiel va me tuer, j'ai rien révisé"], opts, [], () => undefined, vi.fn<typeof fetch>());
    expect(out.alert?.source).toBe("offline_doubt");
  });

  it("the model alone stops the sort on a high score, before any network call", async () => {
    setSafetyModelForTests(model.model);
    const fetchImpl = vi.fn<typeof fetch>();
    const out = await runSort(["ce soir je vais avaler toutes les pilules de la boite"], { ...opts, forceLocal: false }, [], () => undefined, fetchImpl);
    expect(out.alert).not.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
