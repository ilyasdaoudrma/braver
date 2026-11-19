import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FALLBACK_MODEL, GroqError, groqJSON, PRIMARY_MODEL, toGroqSchema } from "@/lib/groq";

const schema = z.object({
  zone: z.enum(["scenario", "action", "acceptation"]),
  why: z.string(),
  step: z.string().nullable(),
});
const ok = (content: unknown): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
const base = { system: "s", user: "u", schema, apiKey: "test-key", models: [PRIMARY_MODEL, FALLBACK_MODEL] };

describe("toGroqSchema", () => {
  it("makes every object strict with all fields required", () => {
    const js = toGroqSchema(schema) as { required: string[]; additionalProperties: boolean; $schema?: string };
    expect(js.required).toEqual(["zone", "why", "step"]);
    expect(js.additionalProperties).toBe(false);
    expect(js.$schema).toBeUndefined();
  });
});

describe("groqJSON", () => {
  it("returns data from the primary model and sends a strict json_schema", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => ok({ zone: "scenario", why: "prédiction", step: null }));
    const r = await groqJSON({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.model).toBe(PRIMARY_MODEL);
    expect(r.data.zone).toBe("scenario");
    expect(r.ms).toBeGreaterThanOrEqual(0);
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
  });

  it("falls back to 120b on HTTP 429", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(ok({ zone: "action", why: "w", step: "s" }));
    const r = await groqJSON({ ...base, fetchImpl });
    expect(r.model).toBe(FALLBACK_MODEL);
  });

  it("falls back when the answer does not match the schema", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ok({ zone: "danger" }))
      .mockResolvedValueOnce(ok({ zone: "acceptation", why: "w", step: null }));
    const r = await groqJSON({ ...base, fetchImpl });
    expect(r.model).toBe(FALLBACK_MODEL);
    expect(r.data.zone).toBe("acceptation");
  });

  it("times out a slow try and reports every failure", async () => {
    const hang = (_url: string, init?: RequestInit): Promise<Response> =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const err = await groqJSON({ ...base, timeoutMs: 20, fetchImpl: vi.fn(hang) as unknown as typeof fetch }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(GroqError);
    expect((err as GroqError).code).toBe("all_failed");
    expect((err as GroqError).attempts.map((a) => a.failure)).toEqual(["timeout", "timeout"]);
  });

  it("throws no_key without an API key and never calls the network", async () => {
    const fetchImpl = vi.fn();
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    await expect(groqJSON({ ...base, apiKey: undefined, fetchImpl })).rejects.toMatchObject({ code: "no_key" });
    if (prev !== undefined) process.env.GROQ_API_KEY = prev;
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
