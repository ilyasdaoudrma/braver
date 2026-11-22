import { describe, expect, it } from "vitest";
import { aiRequestParts } from "@/lib/ai/client";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@/lib/ai/providers";
import { isPrivateAddress, keyRejected, resolveConnection } from "@/lib/server/connection";

const s = (o: Partial<AiSettings>): AiSettings => ({ ...DEFAULT_AI_SETTINGS, ...o });

describe("aiRequestParts (browser)", () => {
  it("sends nothing when the person has no personal key", () => {
    expect(aiRequestParts(s({}))).toEqual({ headers: {} });
    expect(aiRequestParts(s({ provider: "groq", key: "" }))).toEqual({ headers: {} });
  });

  it("puts the key in the header and only provider/model in the body", () => {
    const parts = aiRequestParts(s({ provider: "gemini", key: " AIzaTestKey123456 ", model: "gemini-2.5-flash" }));
    expect(parts.headers).toEqual({ "x-ai-key": "AIzaTestKey123456" });
    expect(parts.ai).toEqual({ provider: "gemini", model: "gemini-2.5-flash", baseUrl: "" });
    expect(JSON.stringify(parts.ai)).not.toContain("AIza");
  });

  it("sends nothing for a custom provider with an unsafe address", () => {
    expect(aiRequestParts(s({ provider: "custom", key: "key-123456789", model: "m", baseUrl: "http://10.0.0.1/v1" }))).toEqual({ headers: {} });
  });
});

describe("resolveConnection (server)", () => {
  const headers = (key?: string) => new Headers(key ? { "x-ai-key": key } : {});

  it("no key: no personal connection (server key or on-device fallback)", () => {
    expect(resolveConnection(headers(), undefined)).toEqual({ ok: true, connection: undefined });
  });

  it("builds a connection to the chosen provider", () => {
    const r = resolveConnection(headers("sk-or-test-123456"), { provider: "openrouter", model: "openai/gpt-oss-20b", baseUrl: "" });
    expect(r.ok && r.connection?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
  });

  it("rejects a malformed key and an unsafe custom address", () => {
    expect(resolveConnection(headers("bad key with spaces"), { provider: "groq" }).ok).toBe(false);
    expect(resolveConnection(headers("key-123456789"), { provider: "custom", model: "m", baseUrl: "https://169.254.169.254/v1" }).ok).toBe(false);
  });
});

describe("keyRejected", () => {
  it("is true only when every try was refused with 401/403", () => {
    expect(keyRejected([{ model: "m", failure: "http", status: 401, ms: 1 }])).toBe(true);
    expect(keyRejected([{ model: "m", failure: "http", status: 429, ms: 1 }])).toBe(false);
    expect(keyRejected([])).toBe(false);
  });
});

describe("isPrivateAddress (DNS check for custom providers)", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1"])(
    "%s is private",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "104.18.0.1", "2606:4700::1111"])("%s is public", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
