import { describe, expect, it } from "vitest";
import { guardObject, guardText, hasForbidden } from "@/lib/guards";

describe("guards", () => {
  it.each([
    "Tu vas réussir, j'en suis sûr.",
    "Ne t'inquiète pas.",
    "Tout ira bien.",
    "Tu exagères un peu.",
    "Ma tkhafch, kolchi ghadi ydouz mzyan.",
    "ما تخافش",
  ])("detects forbidden reassurance: %s", (s) => {
    expect(hasForbidden(s)).toBe(true);
  });

  it("keeps neutral text unchanged", () => {
    expect(guardText("Note ta prédiction et ta certitude.", "x")).toEqual({
      text: "Note ta prédiction et ta certitude.",
      corrected: false,
    });
  });

  it("removes only the forbidden sentences", () => {
    expect(guardText("Ne t'inquiète pas, tout ira bien. Note ta prédiction.", "fallback")).toEqual({
      text: "Note ta prédiction.",
      corrected: true,
    });
  });

  it("uses the fallback when nothing is left", () => {
    expect(guardText("Tout ira bien !", "Note ta prédiction.")).toEqual({ text: "Note ta prédiction.", corrected: true });
    expect(guardText("", "fb")).toEqual({ text: "fb", corrected: false });
    expect(guardText(42, "fb")).toEqual({ text: "fb", corrected: false });
  });

  it("drops irony keys and guards every string without mutating the input", () => {
    const input = { zone: "scenario", why: "Tu exagères.", ironie: "Bravo pour ton don de voyance", n: 3 };
    const { value, corrections } = guardObject(input, { why: "C'est une prédiction." });
    expect(value).toEqual({ zone: "scenario", why: "C'est une prédiction.", n: 3 });
    expect(corrections).toHaveLength(2);
    expect(input.ironie).toBe("Bravo pour ton don de voyance");
  });
});
