import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { connectionFor, type AiRequest } from "@/lib/ai/providers";
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
    const fetchImpl = vi.fn<typeof fetch>(async () => ok({ zone: "scenario", why: "prédiction", step: null }));
    const r = await groqJSON({ ...base, fetchImpl });
    expect(r.model).toBe(PRIMARY_MODEL);
    expect(r.data.zone).toBe("scenario");
    expect(r.ms).toBeGreaterThanOrEqual(0);
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
  });

  it("without a personal connection, sends the same Groq request as before bring-your-own-key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => ok({ zone: "action", why: "w", step: "s" }));
    await groqJSON({ ...base, maxTokens: 900, fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(Object.keys(body).sort()).toEqual(
      ["include_reasoning", "max_completion_tokens", "messages", "model", "reasoning_effort", "response_format", "temperature"].sort(),
    );
    expect(body.model).toBe(PRIMARY_MODEL);
    expect(body.max_completion_tokens).toBe(900);
    expect(body.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "u" },
    ]);
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

describe("groqJSON with a personal connection (bring your own key)", () => {
  const conn = (provider: AiRequest["provider"], model = "", baseUrl = "") =>
    connectionFor({ provider, model, baseUrl }, "user-key-123456");
  const lastBody = (f: ReturnType<typeof vi.fn>) => JSON.parse(String(f.mock.calls.at(-1)?.[1]?.body));

  it("calls the provider URL with the person's key, not the server key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => ok({ zone: "action", why: "w", step: "s" }));
    const r = await groqJSON({ system: "s", user: "u", schema, connection: conn("openai", "gpt-4.1-mini"), fetchImpl });
    expect(r.model).toBe("gpt-4.1-mini");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer user-key-123456");
    const body = lastBody(fetchImpl);
    expect(body.temperature).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.response_format.type).toBe("json_schema");
  });

  it("json_object mode: puts the schema in the system prompt", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => ok({ zone: "scenario", why: "w", step: null }));
    await groqJSON({ system: "SYS", user: "u", schema, connection: conn("gemini"), fetchImpl });
    const body = lastBody(fetchImpl);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toContain("SYS");
    expect(body.messages[0].content).toContain('"zone"');
    expect(body.max_tokens).toBeGreaterThanOrEqual(4000);
  });

  it("prompt mode (Claude): no response_format, and fenced JSON is still read", async () => {
    const fenced = new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"zone":"acceptation","why":"w","step":null}\n```' } }] }), {
      status: 200,
    });
    const fetchImpl = vi.fn<typeof fetch>(async () => fenced);
    const r = await groqJSON({ system: "s", user: "u", schema, connection: conn("anthropic"), fetchImpl });
    expect(r.data.zone).toBe("acceptation");
    expect(lastBody(fetchImpl).response_format).toBeUndefined();
  });

  it("reports an invalid key as an http failure with its status", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("{}", { status: 401 }));
    const err = await groqJSON({ system: "s", user: "u", schema, connection: conn("mistral"), fetchImpl }).catch((e: unknown) => e);
    expect((err as GroqError).attempts).toEqual([expect.objectContaining({ failure: "http", status: 401 })]);
  });
});
