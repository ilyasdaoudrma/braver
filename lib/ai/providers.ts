// Bring-your-own-key AI providers. Shared by the browser (settings screen) and the server routes.
// Every provider is reached through its OpenAI-compatible chat/completions endpoint, so one client covers them all.
// The person's key stays on the device; it travels only with a sort request (header "x-ai-key") and the
// server uses it for that one call, never storing or logging it.
import { z } from "zod";

/** How the provider returns JSON: strict json_schema, json_object, or plain text we extract JSON from. */
export type JsonMode = "strict" | "object" | "prompt";

export interface AiProvider {
  label: string;
  /** OpenAI-compatible base URL (no trailing slash). Empty for "custom". */
  baseUrl: string;
  defaultModel: string;
  /** Extra models tried in order after the main one (Groq only). */
  fallbackModels: readonly string[];
  mode: JsonMode;
  /** Page where the person creates a key. */
  keyUrl: string;
  /** Hint shown under the key field. */
  keyHint: string;
  /** Groq gpt-oss options (reasoning_effort, include_reasoning). */
  groqExtras?: boolean;
  /** The model refuses a custom temperature (OpenAI reasoning models). */
  noTemperature?: boolean;
  /** Uses max_completion_tokens instead of max_tokens. */
  completionTokens?: boolean;
  /** Seconds per try. Groq is fast; other providers may think longer. */
  timeoutMs: number;
  extraHeaders?: (key: string) => Record<string, string>;
}

export const AI_PROVIDERS = {
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    fallbackModels: ["openai/gpt-oss-120b"],
    mode: "strict",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Gratuit. Commence par gsk_",
    groqExtras: true,
    completionTokens: true,
    timeoutMs: 8_000,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    fallbackModels: [],
    mode: "strict",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "Payant. Commence par sk-",
    noTemperature: true,
    completionTokens: true,
    timeoutMs: 15_000,
  },
  gemini: {
    label: "Google AI Studio (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    fallbackModels: [],
    mode: "object",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "Offre gratuite disponible. Commence par AIza",
    timeoutMs: 15_000,
  },
  anthropic: {
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-5-5",
    fallbackModels: [],
    mode: "prompt",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Payant. Commence par sk-ant-",
    timeoutMs: 15_000,
    extraHeaders: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
  },
  openrouter: {
    label: "OpenRouter (des centaines de modèles)",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-oss-20b",
    fallbackModels: [],
    mode: "object",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Certains modèles gratuits. Commence par sk-or-",
    timeoutMs: 15_000,
    extraHeaders: () => ({ "HTTP-Referer": "https://braver-omega.vercel.app", "X-Title": "BRAVER" }),
  },
  mistral: {
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    fallbackModels: [],
    mode: "object",
    keyUrl: "https://console.mistral.ai/api-keys",
    keyHint: "Offre gratuite disponible",
    timeoutMs: 15_000,
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    fallbackModels: [],
    mode: "object",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "Payant, peu cher. Commence par sk-",
    timeoutMs: 15_000,
  },
  custom: {
    label: "Autre (compatible OpenAI)",
    baseUrl: "",
    defaultModel: "",
    fallbackModels: [],
    mode: "object",
    keyUrl: "",
    keyHint: "Toute API compatible OpenAI : Together, Fireworks, xAI, Cerebras…",
    timeoutMs: 15_000,
  },
} as const satisfies Record<string, AiProvider>;

export type AiProviderId = keyof typeof AI_PROVIDERS;
export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[];

const PRIVATE_HOST = /(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** A custom base URL is fetched by our server, so only public https hosts are allowed (no IPs, no internal names). */
export function isSafeBaseUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.startsWith("[") || host.includes(":") || IPV4.test(host)) return false;
  return !PRIVATE_HOST.test(host);
}

/** Printable ASCII only (no spaces or line breaks: the key goes into an HTTP header). */
export function isValidKey(key: string): boolean {
  return /^[\x21-\x7E]{8,300}$/.test(key);
}

/** What the browser sends next to the key (the key itself goes in the "x-ai-key" header). */
export const aiRequestSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS as [AiProviderId, ...AiProviderId[]]),
    model: z.string().trim().max(120).regex(/^[\w.:/@+-]*$/, "modèle invalide").default(""),
    baseUrl: z.string().trim().max(300).default(""),
  })
  .refine((v) => v.provider !== "custom" || (isSafeBaseUrl(v.baseUrl) && v.model.length > 0), {
    message: "Adresse https publique et modèle requis pour « Autre ».",
    path: ["baseUrl"],
  });
export type AiRequest = z.output<typeof aiRequestSchema>;

/** Stored on the device (store key "ai"). provider "none" = no personal key. */
export interface AiSettings {
  provider: AiProviderId | "none";
  key: string;
  model: string;
  baseUrl: string;
}

export const DEFAULT_AI_SETTINGS: Readonly<AiSettings> = Object.freeze({ provider: "none", key: "", model: "", baseUrl: "" });

export const aiSettingsSchema = aiRequestSchema;

export const AI_KEY_HEADER = "x-ai-key";

/** Everything the server needs to call one provider. Built on the server only. */
export interface AiConnection {
  provider: AiProviderId;
  url: string;
  modelsUrl: string;
  models: string[];
  headers: Record<string, string>;
  mode: JsonMode;
  groqExtras: boolean;
  noTemperature: boolean;
  completionTokens: boolean;
  timeoutMs: number;
}

export function connectionFor(req: AiRequest, key: string): AiConnection {
  const p: AiProvider = AI_PROVIDERS[req.provider];
  const base = (req.provider === "custom" ? req.baseUrl : p.baseUrl).replace(/\/+$/, "");
  const main = req.model || p.defaultModel;
  const models = [main, ...p.fallbackModels].filter((m, i, all) => m && all.indexOf(m) === i);
  return {
    provider: req.provider,
    url: `${base}/chat/completions`,
    modelsUrl: `${base}/models`,
    models,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(p.extraHeaders?.(key) ?? {}) },
    mode: p.mode,
    groqExtras: Boolean(p.groqExtras),
    noTemperature: Boolean(p.noTemperature),
    completionTokens: Boolean(p.completionTokens),
    timeoutMs: p.timeoutMs,
  };
}

/** Parses a JSON object from a model answer that may be fenced or wrapped in text. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
