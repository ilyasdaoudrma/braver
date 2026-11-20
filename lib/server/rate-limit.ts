// Best-effort per-IP rate limit (in memory, per serverless instance). Protects the shared Groq budget.
import "server-only";

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** True when the caller is still under `limit` requests in the last minute (and counts this one). */
export function allow(key: string, limit: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  if (hits.size > 5_000) hits.clear(); // bound memory
  return true;
}
