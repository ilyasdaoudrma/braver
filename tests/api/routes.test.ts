import { afterEach, describe, expect, it } from "vitest";
import { POST as sortPOST } from "@/app/api/sort/route";
import { POST as replayPOST } from "@/app/api/replay/route";

const post = (body: unknown, ip: string) =>
  new Request("http://localhost/api/sort", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const prevKey = process.env.GROQ_API_KEY;
afterEach(() => {
  if (prevKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = prevKey;
});

describe("/api/sort", () => {
  it.each([
    ["not json", "{"],
    ["no worries", { worries: [] }],
    ["13 lines", { worries: Array.from({ length: 13 }, () => ({ text: "a" })) }],
    ["line over 500 chars", { worries: [{ text: "x".repeat(501) }] }],
    ["bad tone", { worries: [{ text: "a" }], tone: "ironie" }],
  ])("rejects invalid input (%s) with 400", async (_name, body) => {
    const res = await sortPOST(post(body, "10.0.0.1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input" });
  });

  it("answers 503 no_key when the Groq key is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await sortPOST(post({ worries: [{ text: "Je vais rater." }] }, "10.0.0.2"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "no_key" });
  });

  it("rate-limits one caller after 20 sorts in a minute", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await sortPOST(post("{", "10.0.0.3"))).status);
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});

describe("/api/replay", () => {
  it("rejects a missing outcome with 400", async () => {
    const res = await replayPOST(post({ prediction: "p", certainty: 50 }, "10.0.0.4"));
    expect(res.status).toBe(400);
  });
});
