import { describe, expect, it } from "vitest";
import { checkKeywords } from "@/lib/keywords";

describe("checkKeywords", () => {
  it.each([
    "bghit nmout",
    "ma bqitch baghi nfi9 sbah",
    "kayderbni",
    "Je veux mourir.",
    "ما بقيتش بغيت نعيش",
    "Mon copain me frappe quand il est énervé.",
    "wallah ma b9it baghi n3ich, kanfker n9tel rasi had liyamat",
    "j'ai recommencé a me couper le bras hier soir",
    "bba drebni b smta lyoum",
  ])("flags danger: %s", (text) => {
    expect(checkKeywords(text).level).toBe("danger");
  });

  it.each(["ce partiel va me tuer", "had l exam ghadi yqtelni", "Mon père va me tuer s'il voit mes notes."])(
    "does not flag figurative speech as danger: %s",
    (text) => {
      expect(checkKeywords(text).level).toBe("doubt");
    },
  );

  it.each(["ma bqitch nchouf l9ima dyal rasi", "rah mab9itch nchouf l9ima dyal rasi", "je ne vaux rien"])(
    "flags hopelessness for a gentle check-in: %s",
    (text) => {
      expect(checkKeywords(text).level).toBe("hopeless");
    },
  );

  it.each([
    "Je vais rater mon entretien demain, j'en suis sûr.",
    "Mazal ma siftsh dossier dyal la bourse.",
    "ما بقيتش قادر نقرا، كنأجل كلشي",
    "",
  ])("returns none for ordinary worries: %s", (text) => {
    expect(checkKeywords(text)).toEqual({ level: "none", match: null });
  });
});
