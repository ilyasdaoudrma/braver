import { z } from "zod";
import { aiRequestSchema } from "@/lib/ai/providers";
import { resolveConnection } from "@/lib/server/connection";
import { allow, clientKey } from "@/lib/server/rate-limit";

const CHECKS_PER_MINUTE = 10;
const TIMEOUT_MS = 6_000;
const MAX_MODELS = 300;

export type AiCheckResponse =
  | { ok: true; models: string[] }
  | { ok: false; error: "invalid_input" | "rate_limited" | "key_rejected" | "unreachable" };

function reply(body: AiCheckResponse, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const bodySchema = z.object({ ai: aiRequestSchema });

/** POST /api/ai-check — checks the person's key by listing the provider's models (no tokens spent).
 *  The key comes in the "x-ai-key" header, is used for this one request and is never stored or logged. */
export async function POST(request: Request): Promise<Response> {
  if (!allow(`ai-check:${clientKey(request.headers)}`, CHECKS_PER_MINUTE)) return reply({ ok: false, error: "rate_limited" }, 429);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, error: "invalid_input" }, 400);
  const conn = resolveConnection(request.headers, parsed.data.ai);
  if (!conn.ok || !conn.connection) return reply({ ok: false, error: "invalid_input" }, 400);
  const { modelsUrl, headers, provider } = conn.connection;
  try {
    const getHeaders = Object.fromEntries(Object.entries(headers).filter(([k]) => k !== "Content-Type"));
    const res = await fetch(modelsUrl, { headers: getHeaders, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (res.status === 401 || res.status === 403) return reply({ ok: false, error: "key_rejected" }, 200);
    if (!res.ok) {
      console.warn("[api/ai-check] provider status", provider, res.status);
      return reply({ ok: false, error: "unreachable" }, 200);
    }
    const body = (await res.json().catch(() => null)) as { data?: { id?: unknown }[]; models?: { name?: unknown }[] } | null;
    const ids = (body?.data ?? []).map((m) => m.id).concat((body?.models ?? []).map((m) => m.name));
    const models = ids
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.replace(/^models\//, ""))
      .sort()
      .slice(0, MAX_MODELS);
    return reply({ ok: true, models }, 200);
  } catch {
    console.warn("[api/ai-check] unreachable", provider);
    return reply({ ok: false, error: "unreachable" }, 200);
  }
}
