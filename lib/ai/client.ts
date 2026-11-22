// Browser side of "bring your own key": what to add to /api/sort, /api/replay and /api/ai-check requests.
import { store } from "../store";
import { AI_KEY_HEADER, aiRequestSchema, isValidKey, type AiRequest, type AiSettings } from "./providers";

export interface AiRequestParts {
  headers: Record<string, string>;
  /** Provider and model (no key); undefined when the person has no personal key. */
  ai?: AiRequest;
}

/** Headers + body field for a personal key, or nothing if no (valid) key is set. */
export function aiRequestParts(s: AiSettings): AiRequestParts {
  if (s.provider === "none" || !isValidKey(s.key.trim())) return { headers: {} };
  const parsed = aiRequestSchema.safeParse({ provider: s.provider, model: s.model, baseUrl: s.baseUrl });
  if (!parsed.success) return { headers: {} };
  return { headers: { [AI_KEY_HEADER]: s.key.trim() }, ai: parsed.data };
}

/** Same, read from this device's store. */
export function currentAiParts(): AiRequestParts {
  return aiRequestParts(store.get("ai"));
}

/** True when the person saved a usable personal key. */
export function hasPersonalKey(s: AiSettings = store.get("ai")): boolean {
  return aiRequestParts(s).ai !== undefined;
}
