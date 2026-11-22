// Reads the person's own AI key (header "x-ai-key") and provider choice, and builds the connection for one call.
// The key is never stored, logged or echoed back. Without a key, the routes fall back to the server key if one is set
// (local development); the public deployment has none, so the app then keeps the on-device result.
import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
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

/** Loopback, private, link-local, CGNAT, unspecified and IPv6 local ranges (also IPv4-mapped IPv6). */
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

/** A custom provider's host must resolve only to public addresses (DNS check before the server calls it). */
export async function hostIsPublic(url: string): Promise<boolean> {
  try {
    const answers = await lookup(new URL(url).hostname, { all: true });
    return answers.length > 0 && answers.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/** Custom providers: refuse hosts that resolve to private addresses. Presets are fixed public hosts. */
export async function connectionAllowed(connection: AiConnection | undefined): Promise<boolean> {
  return !connection || connection.provider !== "custom" || hostIsPublic(connection.url);
}

/** Every try was refused with 401/403: the person's key is wrong or has no access to this model. */
export function keyRejected(attempts: readonly GroqAttempt[]): boolean {
  return attempts.length > 0 && attempts.every((a) => a.failure === "http" && (a.status === 401 || a.status === 403));
}
