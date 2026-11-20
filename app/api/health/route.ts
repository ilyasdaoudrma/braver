import { connection } from "next/server";
import { defaultModels } from "@/lib/groq";

const CHECK_TIMEOUT_MS = 3_000;
const CACHE_MS = 60_000;
let last: { at: number; reachable: boolean } | null = null;

/** Is the Groq key set and does Groq answer? Lists models only (no tokens spent). Cached 60 s per instance. */
async function groqReachable(key: string): Promise<boolean> {
  if (last && Date.now() - last.at < CACHE_MS) return last.reachable;
  let reachable = false;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  last = { at: Date.now(), reachable };
  return reachable;
}

export async function GET(): Promise<Response> {
  await connection();
  const key = process.env.GROQ_API_KEY;
  const ai = key ? await groqReachable(key) : false;
  return Response.json({ ok: true, ai, keySet: Boolean(key), models: defaultModels() }, { headers: { "Cache-Control": "no-store" } });
}
