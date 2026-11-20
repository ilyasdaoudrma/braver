// Server logic behind /api/sort and /api/replay: build the prompt, call Groq, guard the output.
import "server-only";
import type { z } from "zod";
import { guardObject, guardText } from "../guards";
import { checkKeywords } from "../keywords";
import { groqJSON, type GroqJSONResult } from "../groq";
import type { ApiSortItem, replayRequestSchema, sortRequestSchema } from "../sort/api";
import { fillFields } from "../sort/rules";
import { CONFIRMED_SAFE_NOTE, llmReplaySchema, llmSortSchema, REPLAY_SYSTEM, SORT_SYSTEM, type LlmSort } from "./prompts";

type SortInput = z.output<typeof sortRequestSchema>;
type ReplayInput = z.output<typeof replayRequestSchema>;

export function buildSortUser(input: SortInput): string {
  // Lines are sent as JSON data (not free text) so a worry cannot pass for an instruction.
  const list = input.worries.map((w, i) => ({ n: i + 1, texte: w.text.replace(/\s+/g, " "), deja: w.seen }));
  return [`Ton : ${input.tone}`, input.confirmedSafe ? CONFIRMED_SAFE_NOTE : null, `Inquiétudes (données JSON) :\n${JSON.stringify(list)}`]
    .filter(Boolean)
    .join("\n");
}

const ZONE_FIELDS = {
  scenario: ["prediction", "question"],
  action: ["step"],
  acceptation: ["validation", "control"],
} as const;

/** Guards one LLM item, keeps only the fields of its zone, and fills empty ones from the on-device texts. */
export function toApiItem(raw: LlmSort["inquietudes"][number], input: SortInput, corrections: string[]): ApiSortItem | null {
  const worry = input.worries[raw.n - 1];
  if (!worry) return null;
  const fb = fillFields(worry.text, raw.zone, worry.seen > 0);
  const mapped = {
    why: raw.pourquoi,
    prediction: raw.prediction ?? "",
    question: raw.question ?? "",
    step: raw.petite_etape ?? "",
    validation: raw.validation ?? "",
    control: raw.controle ?? "",
  };
  const { value, corrections: c } = guardObject(mapped, {
    why: fb.why,
    prediction: fb.prediction ?? "",
    question: fb.question ?? "",
    step: fb.step ?? "",
    validation: fb.validation ?? "",
    control: fb.control ?? "",
  });
  corrections.push(...c.map((x) => `ligne ${raw.n} : ${x}`));
  const keep = new Set<string>(ZONE_FIELDS[raw.zone]);
  const field = (k: keyof typeof value): string | null => (keep.has(k) ? value[k] || null : null);
  return {
    n: raw.n,
    zone: raw.zone,
    why: value.why || fb.why,
    prediction: field("prediction"),
    question: field("question"),
    step: field("step"),
    validation: field("validation"),
    control: field("control"),
    // Backstop: a danger keyword wins over the LLM (prompt injection cannot hide it), unless the person confirmed.
    danger: raw.danger || (!input.confirmedSafe && checkKeywords(worry.text).level === "danger"),
    distress: raw.detresse,
  };
}

export interface ServerSortResult {
  model: string;
  ms: number;
  /** Models that failed before `model` answered, e.g. "openai/gpt-oss-20b:http:429". */
  fallbackFrom: string[];
  items: ApiSortItem[];
  corrections: string[];
}

export async function runSort(input: SortInput, call: typeof groqJSON = groqJSON): Promise<ServerSortResult> {
  const res: GroqJSONResult<LlmSort> = await call({
    system: SORT_SYSTEM,
    user: buildSortUser(input),
    schema: llmSortSchema,
    name: "braver_sort",
    // Measured 20 Nov: 4 lines ≈ 625 completion tokens, 12 lines ≈ 1,430 (reasoning included). Groq counts this cap
    // against the 8k tokens/min budget, so keep it tight (~40 % headroom).
    maxTokens: 600 + 120 * input.worries.length,
  });
  const corrections: string[] = [];
  const seen = new Set<number>();
  const items = res.data.inquietudes
    .filter((it) => !seen.has(it.n) && seen.add(it.n))
    .map((it) => toApiItem(it, input, corrections))
    .filter((it): it is ApiSortItem => it !== null)
    .sort((a, b) => a.n - b.n);
  return { model: res.model, ms: res.ms, fallbackFrom: res.attempts.map((a) => `${a.model}:${a.failure}${a.status ? `:${a.status}` : ""}`), items, corrections };
}

const WORST = { oui: "oui, le pire est arrivé", en_partie: "en partie", non: "non, le pire n'est pas arrivé" } as const;

export function localReplayComment(input: Pick<ReplayInput, "certainty" | "worstHappened">): string {
  if (input.worstHappened === "oui")
    return "C'était aussi dur que prévu, et tu y as fait face. Qu'est-ce qui t'a aidé à tenir, et que garderais-tu pour la prochaine fois ?";
  if (input.worstHappened === "en_partie") return "Une partie de ta prédiction s'est réalisée, pas tout. Quelle partie avais-tu surestimée ?";
  const c = input.certainty;
  return `${c ? `Tu étais sûr à ${c} %, et` : "Et"} le pire n'est pas arrivé : la réalité a été différente de ta prédiction. Qu'est-ce que tu en retiens pour la prochaine fois ?`;
}

export async function runReplay(input: ReplayInput, call: typeof groqJSON = groqJSON): Promise<{ model: string; ms: number; comment: string }> {
  const user = [
    `Prédiction avant : ${input.prediction}`,
    `Certitude avant : ${input.certainty} %`,
    `Ce qui s'est vraiment passé : ${input.outcome}`,
    `Le pire est-il arrivé ? ${input.worstHappened ? WORST[input.worstHappened] : "non précisé"}`,
  ].join("\n");
  const res = await call({ system: REPLAY_SYSTEM, user, schema: llmReplaySchema, name: "braver_replay", maxTokens: 700 });
  return { model: res.model, ms: res.ms, comment: guardText(res.data.commentaire, localReplayComment(input)).text };
}
