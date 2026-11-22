// Reads the person's own AI key (header "x-ai-key") and provider choice, and builds the connection for one call.
// The key is never stored, logged or echoed back. Without a key, the routes fall back to the server key if one is set
// (local development); the public deployment has none, so the app then keeps the on-device result.
import "server-only";
import { AI_KEY_HEADER, aiRequestSchema, connectionFor, isValidKey, type AiConnection } from "../ai/providers";
import type { GroqAttempt } from "../groq";

export type ConnectionResult = { ok: true; connection: AiConnection | undefined } | { ok: false };

export function resolveConnection(headers: Headers, ai: unknown): ConnectionResult {
  const key = headers.get(AI_KEY_HEADER)?.trim();
  if (!key) return { ok: true, connection: undefined };
  if (!isValidKey(key)) return { ok: false };
  const parsed = aiRequestSchema.safeParse(ai ?? { provider: "groq" });
  if (!parsed.success) return { ok: false };
  return { ok: true, connection: connectionFor(parsed.data, key) };
}

/** Every try was refused with 401/403: the person's key is wrong or has no access to this model. */
export function keyRejected(attempts: readonly GroqAttempt[]): boolean {
  return attempts.length > 0 && attempts.every((a) => a.failure === "http" && (a.status === 401 || a.status === 403));
}
