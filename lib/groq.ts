// Server-only Groq client (Route Handlers). Never import this from a "use client" file:
// GROQ_API_KEY must stay on the server. Shared file: change it in a small "shared:" PR.
import "server-only";
import { z } from "zod";

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
}

export interface GroqJSONResult<T> {
  data: T;
  /** Model that produced the answer. */
  model: string;
  /** Total time since the call started (all tries), in ms. */
  ms: number;
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

async function tryModel<T>(model: string, opts: GroqJSONOptions<T>, key: string, jsonSchema: JsonSchema): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TRY_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await doFetch(GROQ_URL, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          response_format: { type: "json_schema", json_schema: { name: opts.name ?? "answer", strict: true, schema: jsonSchema } },
          reasoning_effort: opts.reasoningEffort ?? "low",
          include_reasoning: false,
          temperature: opts.temperature ?? 0.2,
          max_completion_tokens: opts.maxTokens ?? 1_200,
        }),
      });
    } catch {
      throw new TryFailure(controller.signal.aborted ? "timeout" : "network");
    }
    if (!res.ok) throw new TryFailure("http", res.status);
    let content: unknown;
    try {
      const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      content = JSON.parse(String(body.choices?.[0]?.message?.content ?? ""));
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
  const key = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!key) throw new GroqError("no_key");
  const jsonSchema = toGroqSchema(opts.schema);
  const start = performance.now();
  const attempts: GroqAttempt[] = [];
  for (const model of opts.models ?? defaultModels()) {
    const t = performance.now();
    try {
      const data = await tryModel(model, opts, key, jsonSchema);
      return { data, model, ms: Math.round(performance.now() - start) };
    } catch (err) {
      const f = err instanceof TryFailure ? err : new TryFailure("network");
      attempts.push({ model, failure: f.failure, status: f.status, ms: Math.round(performance.now() - t) });
    }
  }
  throw new GroqError("all_failed", attempts);
}
