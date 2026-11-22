import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  aiSettingsSchema,
  connectionFor,
  extractJson,
  isSafeBaseUrl,
  isValidKey,
  type AiRequest,
} from "@/lib/ai/providers";

const settings = (s: Partial<AiRequest>): AiRequest => ({ provider: "groq", model: "", baseUrl: "", ...s });

describe("provider presets", () => {
  it("covers the main providers plus a custom OpenAI-compatible one", () => {
    expect(Object.keys(AI_PROVIDERS)).toEqual(["groq", "openai", "gemini", "anthropic", "openrouter", "mistral", "deepseek", "custom"]);
  });

  it("gives every preset an https base URL, a default model and a key page", () => {
    for (const [id, p] of Object.entries(AI_PROVIDERS)) {
      if (id === "custom") continue;
      expect(p.baseUrl.startsWith("https://"), id).toBe(true);
      expect(p.defaultModel.length, id).toBeGreaterThan(0);
      expect(p.keyUrl.startsWith("https://"), id).toBe(true);
    }
  });
});

describe("isValidKey", () => {
  it("accepts printable keys and rejects spaces, newlines and tiny strings", () => {
    expect(isValidKey("gsk_abcdefghijklmnop1234")).toBe(true);
    expect(isValidKey("sk-ant-api03-xyz_ABC-123456")).toBe(true);
    expect(isValidKey("short")).toBe(false);
    expect(isValidKey("abc def ghi jkl mno")).toBe(false);
    expect(isValidKey("abcdefgh\r\nX-Evil: 1")).toBe(false);
    expect(isValidKey("a".repeat(400))).toBe(false);
  });
});

describe("isSafeBaseUrl (custom provider, server fetches it)", () => {
  it("accepts a public https API", () => {
    expect(isSafeBaseUrl("https://api.together.xyz/v1")).toBe(true);
    expect(isSafeBaseUrl("https://my-proxy.example.com/openai/v1")).toBe(true);
  });

  it.each([
    "http://api.example.com/v1",
    "https://localhost/v1",
    "https://app.localhost/v1",
    "https://127.0.0.1/v1",
    "https://10.0.0.5/v1",
    "https://[::1]/v1",
    "https://169.254.169.254/latest",
    "https://metadata.google.internal/v1",
    "https://printer.local/v1",
    "https://user:pass@api.example.com/v1",
    "https://api.example.com:8443/v1",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isSafeBaseUrl(url)).toBe(false);
  });
});

describe("aiSettingsSchema", () => {
  it("requires a safe base URL only for the custom provider", () => {
    expect(aiSettingsSchema.safeParse(settings({ provider: "custom", model: "m", baseUrl: "https://127.0.0.1/v1" })).success).toBe(false);
    expect(aiSettingsSchema.safeParse(settings({ provider: "custom", model: "m", baseUrl: "https://api.example.com/v1" })).success).toBe(true);
    expect(aiSettingsSchema.safeParse(settings({ provider: "groq" })).success).toBe(true);
  });

  it("rejects an unknown provider", () => {
    expect(aiSettingsSchema.safeParse({ provider: "evil", model: "", baseUrl: "" }).success).toBe(false);
  });
});

describe("connectionFor", () => {
  it("Groq: strict JSON schema, 20b then 120b by default", () => {
    const c = connectionFor(settings({ provider: "groq" }), "gsk_test_key_123456");
    expect(c.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(c.mode).toBe("strict");
    expect(c.models).toEqual(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
    expect(c.headers.Authorization).toBe("Bearer gsk_test_key_123456");
  });

  it("uses the model the person chose instead of the default", () => {
    const c = connectionFor(settings({ provider: "openai", model: "gpt-4.1-mini" }), "sk-test-key-123456");
    expect(c.models).toEqual(["gpt-4.1-mini"]);
    expect(c.url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("Anthropic: prompt-only JSON and its own auth headers", () => {
    const c = connectionFor(settings({ provider: "anthropic" }), "sk-ant-test-123456");
    expect(c.mode).toBe("prompt");
    expect(c.headers["x-api-key"]).toBe("sk-ant-test-123456");
    expect(c.headers["anthropic-version"]).toBeTruthy();
  });

  it("custom: uses the given base URL without a trailing slash", () => {
    const c = connectionFor(settings({ provider: "custom", model: "llama-3", baseUrl: "https://api.example.com/v1/" }), "key-123456789");
    expect(c.url).toBe("https://api.example.com/v1/chat/completions");
    expect(c.modelsUrl).toBe("https://api.example.com/v1/models");
    expect(c.mode).toBe("object");
  });
});

describe("extractJson", () => {
  it("parses plain JSON, fenced JSON and JSON with text around it", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Voici le résultat : {"a":3} — fin')).toEqual({ a: 3 });
  });

  it("throws when there is no JSON object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("isSafeBaseUrl, security review", () => {
  it.each([
    "https://localhost./v1",
    "https://metadata.google.internal./v1",
    "https://printer.local./v1",
    "https://2130706433/v1",
    "https://0x7f.1/v1",
    "https://api.example.com/v1?x=1",
    "https://api.example.com/v1#frag",
  ])("rejects %s", (url) => {
    expect(isSafeBaseUrl(url)).toBe(false);
  });
});
