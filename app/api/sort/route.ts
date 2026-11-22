import { GroqError } from "@/lib/groq";
import type { ApiSortResponse } from "@/lib/sort/api";
import { sortRequestSchema } from "@/lib/sort/api";
import { connectionAllowed, keyRejected, resolveConnection } from "@/lib/server/connection";
import { allow, clientKey } from "@/lib/server/rate-limit";
import { runSort } from "@/lib/server/sort";

const SORTS_PER_MINUTE = 20;

function reply(body: ApiSortResponse, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** POST /api/sort — sorts up to 12 worries with the person's own AI key (or the server key in local dev).
 *  Only the worry texts are sent to the provider, never an identifier. The key is used for this call only. */
export async function POST(request: Request): Promise<Response> {
  if (!allow(`sort:${clientKey(request.headers)}`, SORTS_PER_MINUTE)) return reply({ ok: false, error: "rate_limited" }, 429);
  const body: unknown = await request.json().catch(() => null);
  const parsed = sortRequestSchema.safeParse(body);
  if (!parsed.success) return reply({ ok: false, error: "invalid_input" }, 400);
  const conn = resolveConnection(request.headers, parsed.data.ai);
  if (!conn.ok || !(await connectionAllowed(conn.connection))) return reply({ ok: false, error: "invalid_input" }, 400);
  try {
    const result = await runSort(parsed.data, undefined, conn.connection);
    if (result.fallbackFrom.length) console.warn("[api/sort] fallback", result.fallbackFrom.join(", "), "->", result.model);
    return reply({ ok: true, ...result }, 200);
  } catch (err) {
    if (err instanceof GroqError && err.code === "no_key") return reply({ ok: false, error: "no_key" }, 503);
    if (err instanceof GroqError && conn.connection && keyRejected(err.attempts)) return reply({ ok: false, error: "key_rejected" }, 401);
    const failures = err instanceof GroqError ? err.attempts.map((a) => `${a.model}:${a.failure}${a.status ? `:${a.status}` : ""}`) : ["unexpected"];
    console.error("[api/sort] llm_failed", failures.join(", "));
    return reply({ ok: false, error: "llm_failed" }, 502);
  }
}
