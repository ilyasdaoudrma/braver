import Anthropic from "@anthropic-ai/sdk";

// Deux moteurs possibles, choisis par les variables d'environnement (Vercel → Settings → Environment Variables) :
//   ANTHROPIC_API_KEY → Claude (Anthropic)     modèle : BRAVER_MODEL (défaut claude-opus-5-5)
//   GEMINI_API_KEY    → Gemini (Google, offre gratuite sans carte)   modèle : GEMINI_MODEL, puis chaîne de secours
// Sans aucune clé, /api renvoie "no_key" et le navigateur trie avec les règles locales.

export const PROVIDER = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : null;

export function hasKey() {
  return PROVIDER !== null;
}

// Extrait le premier objet JSON d'un texte (au cas où le modèle ajoute du texte autour).
export function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no_json");
  return JSON.parse(text.slice(start, end + 1));
}

/* ------------------------------------------------------------------ Claude (Anthropic) */

const CLAUDE_MODEL = process.env.BRAVER_MODEL || "claude-opus-5-5";
// Le tri est une classification courte : effort "low" garde la démo rapide.
const EFFORT = process.env.BRAVER_EFFORT || "low";

let anthropic = null;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return anthropic;
}

function textOf(response) {
  if (response.stop_reason === "refusal") throw new Error("refusal");
  if (response.stop_reason === "max_tokens") throw new Error("max_tokens");
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// 1) JSON garanti par structured outputs + repli serveur en cas de refus ("fallbacks").
// 2) Si la requête est refusée (400), on réessaie sans ces options : l'instruction demande déjà du JSON.
async function claudeJSON({ system, user, schema, maxTokens }) {
  const c = getAnthropic();
  const base = { model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] };
  let response;
  try {
    response = await c.beta.messages.create({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: { type: "json_schema", schema } },
    });
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) response = await c.messages.create(base);
    else throw err;
  }
  return extractJSON(textOf(response));
}

/* ------------------------------------------------------------------ Gemini (Google) */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const SAFETY_CATEGORIES = ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"];
// Chaîne de modèles (mesurée le 19/11/2026 sur l'offre gratuite) : le plus fiable d'abord, puis des versions
// « lite » très rapides si le premier est saturé (503), limité (429) ou trop lent.
const GEMINI_CHAIN = [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"].filter(
  (m, i, a) => m && a.indexOf(m) === i
);
let lastGeminiModel = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Renvoie l'objet JSON, ou { __blocked: true } si le filtre de Google a bloqué le texte (traité comme une alerte).
async function geminiJSON({ system, user, maxTokens }) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens },
    safetySettings: SAFETY_CATEGORIES.map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
  });
  let lastError = "gemini_unavailable";
  for (const [i, model] of GEMINI_CHAIN.entries()) {
    let r;
    try {
      r = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body,
        signal: AbortSignal.timeout(i === 0 ? 22_000 : 14_000),
      });
    } catch (e) {
      lastError = e?.name === "TimeoutError" ? `timeout_${model}` : `network_${model}`;
      continue;
    }
    if ([429, 500, 503, 404].includes(r.status)) {
      lastError = `gemini_${r.status}_${model}`;
      if (r.status === 429) await sleep(1500);
      continue;
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`gemini_${r.status}`);
    lastGeminiModel = model;
    if (data.promptFeedback?.blockReason) return { __blocked: true };
    const cand = data.candidates?.[0];
    if (!cand) throw new Error("gemini_empty");
    if (cand.finishReason === "SAFETY" || cand.finishReason === "PROHIBITED_CONTENT") return { __blocked: true };
    const text = (cand.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("");
    return extractJSON(text);
  }
  throw new Error(lastError);
}

/* ------------------------------------------------------------------ Commun */

export async function modelLabel() {
  if (PROVIDER === "anthropic") return CLAUDE_MODEL;
  if (PROVIDER === "gemini") return lastGeminiModel || GEMINI_CHAIN[0];
  return null;
}

/** Appelle le moteur configuré et renvoie un objet JSON. Toute erreur remonte : le navigateur bascule alors sur les règles locales. */
export async function askJSON({ system, user, schema, maxTokens = 8000 }) {
  if (PROVIDER === "anthropic") return claudeJSON({ system, user, schema, maxTokens });
  if (PROVIDER === "gemini") return geminiJSON({ system, user, maxTokens });
  throw new Error("no_key");
}

export function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

export function errorInfo(err) {
  if (err instanceof Anthropic.APIError) return `api_${err.status ?? "network"}`;
  if (err?.name === "TimeoutError") return "timeout";
  return String(err?.message || err).slice(0, 120);
}
