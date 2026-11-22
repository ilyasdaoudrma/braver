// Contract of /api/sort and /api/replay, shared by the server routes and the browser.
import { z } from "zod";
import { aiRequestSchema } from "../ai/providers";

export const MAX_LINES = 12;
export const MAX_CHARS = 500;

export const sortRequestSchema = z.object({
  worries: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(MAX_CHARS),
        /** How many times a similar worry was already written (computed on the device). */
        seen: z.number().int().min(0).max(50).default(0),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  tone: z.enum(["doux", "direct"]).default("doux"),
  /** The person pressed "On s'est mal compris" on the safety screen. */
  confirmedSafe: z.boolean().default(false),
  /** Bring your own key: provider and model (the key itself travels in the "x-ai-key" header). */
  ai: aiRequestSchema.optional(),
});
export type SortRequest = z.input<typeof sortRequestSchema>;

export const zoneSchema = z.enum(["scenario", "action", "acceptation"]);

export interface ApiSortItem {
  /** 1-based line number. */
  n: number;
  zone: z.infer<typeof zoneSchema>;
  why: string;
  prediction: string | null;
  question: string | null;
  step: string | null;
  validation: string | null;
  control: string | null;
  danger: boolean;
  distress: boolean;
}

export type ApiError = "invalid_input" | "rate_limited" | "no_key" | "key_rejected" | "llm_failed";

export type ApiSortResponse =
  | { ok: true; model: string; ms: number; fallbackFrom: string[]; items: ApiSortItem[]; corrections: string[] }
  | { ok: false; error: ApiError };

export const replayRequestSchema = z.object({
  prediction: z.string().trim().min(1).max(400),
  outcome: z.string().trim().min(1).max(600),
  certainty: z.number().int().min(0).max(100),
  worstHappened: z.enum(["oui", "non", "en_partie"]).nullable().default(null),
  ai: aiRequestSchema.optional(),
});
export type ReplayRequest = z.input<typeof replayRequestSchema>;

export type ApiReplayResponse = { ok: true; model: string; ms: number; comment: string } | { ok: false; error: ApiError };
