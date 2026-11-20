import { describe, expect, it, vi } from "vitest";
import type { ApiSortItem, ApiSortResponse } from "@/lib/sort/api";
import { mergeLLM, onLLMFailure, runSort, seenCount, sortOnDevice, splitLines, type SortOutcome } from "@/lib/sort/engine";

const opts = { tone: "doux" as const, confirmedSafe: false, forceLocal: false };

function item(n: number, over: Partial<ApiSortItem> = {}): ApiSortItem {
  return { n, zone: "action", why: "w", prediction: null, question: null, step: "Envoie le mail.", validation: null, control: null, danger: false, distress: false, ...over };
}
const ok = (items: ApiSortItem[]): Extract<ApiSortResponse, { ok: true }> => ({ ok: true, model: "openai/gpt-oss-20b", ms: 900, items, corrections: [] });

describe("splitLines / seenCount", () => {
  it("keeps non-empty trimmed lines, 12 max, 500 chars max", () => {
    const raw = ["  a  ", "", ...Array.from({ length: 20 }, (_, i) => `l${i}`), "x".repeat(600)].join("\n");
    const lines = splitLines(raw);
    expect(lines[0]).toBe("a");
    expect(lines).toHaveLength(12);
    expect(splitLines("x".repeat(600))[0]).toHaveLength(500);
  });

  it("counts similar earlier worries", () => {
    expect(seenCount("Je vais rater mon partiel de stats", ["je vais rater le partiel de stats", "autre chose"])).toBe(1);
  });
});

describe("sortOnDevice", () => {
  it("alerts at once on a danger keyword, with no cards", () => {
    const out = sortOnDevice(["Je vais rater mon exposé.", "bghit nmout"], opts);
    expect(out.alert).toEqual({ source: "keywords", lines: ["bghit nmout"] });
    expect(out.cards).toEqual([]);
  });

  it("sorts on the device, marks doubts as checking and hopelessness as distress", () => {
    const out = sortOnDevice(["Bba khrjouh mn lkhedma.", "ce partiel va me tuer", "ma bqitch nchouf l9ima dyal rasi"], opts);
    expect(out.alert).toBeNull();
    expect(out.engine).toBe("device");
    expect(out.cards[0]).toMatchObject({ zone: "acceptation", source: "device", checking: false });
    expect(out.cards[0].validation).toBeTruthy();
    expect(out.cards[1].checking).toBe(true);
    expect(out.cards[2].distress).toBe(true);
  });

  it("after 'On s'est mal compris', a danger keyword becomes a doubt for the LLM", () => {
    const out = sortOnDevice(["bghit nmout"], { confirmedSafe: true });
    expect(out.alert).toBeNull();
    expect(out.cards[0].checking).toBe(true);
  });
});

describe("mergeLLM / onLLMFailure", () => {
  const device = (): SortOutcome => sortOnDevice(["Mazal ma siftsh dossier dyal la bourse.", "ce partiel va me tuer"], opts);

  it("upgrades every card with the LLM answer and its timing", () => {
    const out = mergeLLM(device(), ok([item(1), item(2, { zone: "scenario", prediction: "p", question: "q", step: null })]), 1234);
    expect(out.engine).toBe("llm");
    expect(out.cards.map((c) => [c.source, c.model, c.ms, c.checking])).toEqual([
      ["llm", "openai/gpt-oss-20b", 1234, false],
      ["llm", "openai/gpt-oss-20b", 1234, false],
    ]);
    expect(out.cards[1].zone).toBe("scenario");
  });

  it("keeps the on-device card for a line the LLM skipped", () => {
    const out = mergeLLM(device(), ok([item(2)]), 10);
    expect(out.cards[0].source).toBe("device");
    expect(out.cards[1].source).toBe("llm");
  });

  it("shows the safety screen when the LLM flags a line", () => {
    const out = mergeLLM(device(), ok([item(1), item(2, { danger: true })]), 10);
    expect(out.alert).toEqual({ source: "llm", lines: ["ce partiel va me tuer"] });
    expect(out.cards).toEqual([]);
  });

  it("offline: an unresolved doubt becomes an alert", () => {
    expect(onLLMFailure(device(), "network", opts).alert?.source).toBe("offline_doubt");
  });

  it("offline without doubt: keeps the device cards and says why", () => {
    const d = sortOnDevice(["Mazal ma siftsh dossier dyal la bourse."], opts);
    const out = onLLMFailure(d, "timeout", opts);
    expect(out.alert).toBeNull();
    expect(out.cards).toHaveLength(1);
    expect(out.failure).toBe("timeout");
  });
});

describe("runSort", () => {
  it("reports the on-device result first, then the LLM upgrade", async () => {
    const updates: [string, boolean][] = [];
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(ok([item(1)])));
    const out = await runSort(["Mazal ma siftsh dossier."], opts, [], (o, final) => updates.push([o.engine, final]), fetchImpl);
    expect(updates).toEqual([
      ["device", false],
      ["llm", true],
    ]);
    expect(out.engine).toBe("llm");
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toEqual({ worries: [{ text: "Mazal ma siftsh dossier.", seen: 0 }], tone: "doux", confirmedSafe: false });
  });

  it("never calls the network after a keyword alert or in forced local mode", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await runSort(["bghit nmout"], opts, [], () => undefined, fetchImpl);
    await runSort(["Mazal ma siftsh dossier."], { ...opts, forceLocal: true }, [], () => undefined, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("stays on the device when the API answers with an error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ ok: false, error: "llm_failed" }, { status: 502 }));
    const out = await runSort(["Mazal ma siftsh dossier."], opts, [], () => undefined, fetchImpl);
    expect(out.engine).toBe("device");
    expect(out.failure).toBe("llm_failed");
  });

  it("stays on the device when the network throws", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const out = await runSort(["Mazal ma siftsh dossier."], opts, [], () => undefined, fetchImpl);
    expect(out.failure).toBe("network");
  });
});
