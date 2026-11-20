// Best-effort per-IP rate limit (in memory, per serverless instance). Protects the shared Groq budget.
import "server-only";

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function clientKey(headers: Headers): string {
  // On Vercel, x-real-ip is set by the platform (the client cannot spoof it).
  return headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** True when the caller is still under `limit` requests in the last minute (and counts this one). */
export function allow(key: string, limit: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  if (hits.size > 5_000) {
    // Bound memory: drop only callers with no request in the window.
    for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}
