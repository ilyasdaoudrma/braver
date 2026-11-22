// Server-only AI client (Route Handlers). Never import this from a "use client" file.
// Default: Groq with the server's GROQ_API_KEY (local dev). With `connection`: the person's own provider and key
// (bring your own key, see lib/ai/providers.ts); the key is used for this call only, never stored or logged.
// Shared file: change it in a small "shared:" PR.
import "server-only";
import { z } from "zod";
import { extractJson, type AiConnection } from "./ai/providers";

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const PRIMARY_MODEL = "openai/gpt-oss-20b";
export const FALLBACK_MODEL = "openai/gpt-oss-120b";
export const TRY_TIMEOUT_MS = 8_000;

export type ReasoningEffort = "low" | "medium" | "high";

export interface GroqJSONOptions<T> {
  system: string;
  user: string;
  /** zod schema of the expected answer. Use `.nullable()` instead of `.optional()` (Groq strict mode needs every field required). */
  schema: z.ZodType<T>;
  /** Name sent with the JSON schema (letters, digits, _ and -). */
  name?: string;
  /** Models tried in order. Default: GROQ_MODEL → GROQ_FALLBACK_MODEL (env) or 20b → 120b. */
  models?: readonly string[];
  timeoutMs?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  /** Lower = more stable answers between runs. Default 0.2. */
  temperature?: number;
  /** For tests. */
  fetchImpl?: typeof fetch;
  apiKey?: string;
  /** The person's own provider + key. When set, the server key and the Groq defaults are not used. */
  connection?: AiConnection;
}

export interface GroqJSONResult<T> {
  data: T;
  /** Model that produced the answer. */
  model: string;
  /** Total time since the call started (all tries), in ms. */
  ms: number;
  /** Tries that failed before this answer (empty when the first model answered). */
  attempts: GroqAttempt[];
}

export type GroqFailure = "timeout" | "http" | "invalid_json" | "invalid_schema" | "network";

export interface GroqAttempt {
  model: string;
  failure: GroqFailure;
  status: number | null;
  ms: number;
}

export class GroqError extends Error {
  readonly code: "no_key" | "all_failed";
  readonly attempts: readonly GroqAttempt[];
  constructor(code: "no_key" | "all_failed", attempts: readonly GroqAttempt[] = []) {
    super(code === "no_key" ? "GROQ_API_KEY is not set" : `All Groq models failed: ${attempts.map((a) => `${a.model}=${a.failure}`).join(", ")}`);
    this.name = "GroqError";
    this.code = code;
    this.attempts = attempts;
  }
}

export function defaultModels(): string[] {
  const list = [process.env.GROQ_MODEL || PRIMARY_MODEL, process.env.GROQ_FALLBACK_MODEL || FALLBACK_MODEL];
  return list.filter((m, i) => list.indexOf(m) === i);
}

type JsonSchema = { [key: string]: unknown };

/** Groq strict mode: every object lists all its properties as required and forbids extra ones. */
function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify);
  if (!node || typeof node !== "object") return node;
  const entries = Object.entries(node as JsonSchema)
    .filter(([k]) => k !== "$schema")
    .map(([k, v]) => [k, strictify(v)] as const);
  const out: JsonSchema = Object.fromEntries(entries);
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.required = Object.keys(out.properties as JsonSchema);
    out.additionalProperties = false;
  }
  return out;
}

export function toGroqSchema(schema: z.ZodType): JsonSchema {
  return strictify(z.toJSONSchema(schema, { target: "draft-7", io: "output" })) as JsonSchema;
}

class TryFailure extends Error {
  readonly failure: GroqFailure;
  readonly status: number | null;
  constructor(failure: GroqFailure, status: number | null = null) {
    super(failure);
    this.failure = failure;
    this.status = status;
  }
}

/** Default connection: Groq with the server key (local dev, or a deployment that sets GROQ_API_KEY). */
function serverConnection(key: string, models: readonly string[]): AiConnection {
  return {
    provider: "groq",
    url: GROQ_URL,
    modelsUrl: GROQ_URL.replace("/chat/completions", "/models"),
    models: [...models],
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    mode: "strict",
    groqExtras: true,
    noTemperature: false,
    completionTokens: true,
    timeoutMs: TRY_TIMEOUT_MS,
  };
}

/** Request body for one model, adapted to how the provider returns JSON. */
function requestBody<T>(model: string, opts: GroqJSONOptions<T>, conn: AiConnection, jsonSchema: JsonSchema): Record<string, unknown> {
  const schemaHint = `

Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour) qui suit ce schéma JSON :
${JSON.stringify(jsonSchema)}`;
  const system = conn.mode === "strict" ? opts.system : opts.system + schemaHint;
  // Providers other than Groq may use thinking models that spend tokens before answering: give them room.
  const maxTokens = conn.groqExtras ? (opts.maxTokens ?? 1_200) : Math.max(2_000, 2 * (opts.maxTokens ?? 1_200));
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: opts.user },
    ],
    [conn.completionTokens ? "max_completion_tokens" : "max_tokens"]: maxTokens,
  };
  if (conn.mode === "strict") body.response_format = { type: "json_schema", json_schema: { name: opts.name ?? "answer", strict: true, schema: jsonSchema } };
  if (conn.mode === "object") body.response_format = { type: "json_object" };
  if (conn.groqExtras) {
    body.reasoning_effort = opts.reasoningEffort ?? "low";
    body.include_reasoning = false;
  }
  if (!conn.noTemperature) body.temperature = opts.temperature ?? 0.2;
  return body;
}

async function tryModel<T>(model: string, opts: GroqJSONOptions<T>, conn: AiConnection, jsonSchema: JsonSchema): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? conn.timeoutMs);
  try {
    let res: Response;
    try {
      res = await doFetch(conn.url, {
        method: "POST",
        signal: controller.signal,
        // A custom base URL must not bounce the server to another (internal) address.
        redirect: "error",
        headers: conn.headers,
        body: JSON.stringify(requestBody(model, opts, conn, jsonSchema)),
      });
    } catch {
      throw new TryFailure(controller.signal.aborted ? "timeout" : "network");
    }
    if (!res.ok) throw new TryFailure("http", res.status);
    let content: unknown;
    try {
      const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      content = extractJson(String(body.choices?.[0]?.message?.content ?? ""));
    } catch {
      throw new TryFailure(controller.signal.aborted ? "timeout" : "invalid_json", res.status);
    }
    const parsed = opts.schema.safeParse(content);
    if (!parsed.success) throw new TryFailure("invalid_schema", res.status);
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls Groq with a strict JSON schema, validates the answer with zod,
 * and falls back to the next model on timeout (8 s per try), HTTP error, or invalid output.
 * Throws GroqError ("no_key" | "all_failed"); the caller then keeps the on-device result.
 */
export async function groqJSON<T>(opts: GroqJSONOptions<T>): Promise<GroqJSONResult<T>> {
  let conn = opts.connection;
  if (!conn) {
    const key = opts.apiKey ?? process.env.GROQ_API_KEY;
    if (!key) throw new GroqError("no_key");
    conn = serverConnection(key, opts.models ?? defaultModels());
  }
  const jsonSchema = toGroqSchema(opts.schema);
  const start = performance.now();
  const attempts: GroqAttempt[] = [];
  for (const model of opts.connection ? conn.models : (opts.models ?? defaultModels())) {
    const t = performance.now();
    try {
      const data = await tryModel(model, opts, conn, jsonSchema);
      return { data, model, ms: Math.round(performance.now() - start), attempts };
    } catch (err) {
      const f = err instanceof TryFailure ? err : new TryFailure("network");
      attempts.push({ model, failure: f.failure, status: f.status, ms: Math.round(performance.now() - t) });
    }
  }
  throw new GroqError("all_failed", attempts);
}
