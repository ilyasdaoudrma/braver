import { GroqError } from "@/lib/groq";
import type { ApiReplayResponse } from "@/lib/sort/api";
import { replayRequestSchema } from "@/lib/sort/api";
import { allow, clientKey } from "@/lib/server/rate-limit";
import { runReplay } from "@/lib/server/sort";

const REPLAYS_PER_MINUTE = 20;

function reply(body: ApiReplayResponse, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** POST /api/replay — short comment comparing a prediction with what happened. */
export async function POST(request: Request): Promise<Response> {
  if (!allow(`replay:${clientKey(request.headers)}`, REPLAYS_PER_MINUTE)) return reply({ ok: false, error: "rate_limited" }, 429);
  const body: unknown = await request.json().catch(() => null);
  const parsed = replayRequestSchema.safeParse(body);
  if (!parsed.success) return reply({ ok: false, error: "invalid_input" }, 400);
  try {
    return reply({ ok: true, ...(await runReplay(parsed.data)) }, 200);
  } catch (err) {
    if (err instanceof GroqError && err.code === "no_key") return reply({ ok: false, error: "no_key" }, 503);
    console.error("[api/replay] llm_failed", err instanceof GroqError ? err.attempts.map((a) => `${a.model}:${a.failure}`).join(", ") : "unexpected");
    return reply({ ok: false, error: "llm_failed" }, 502);
  }
}
