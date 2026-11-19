# Groq — what our account actually gives us (measured 19 Nov 2026, ~23:50)

API: `https://api.groq.com/openai/v1` (OpenAI-compatible). Key: `GROQ_API_KEY` in `.env.local` / Vercel only.

## Models available on our key (`GET /v1/models`)

| Model | Context | Max output | Use in BRAVER |
|---|---|---|---|
| `openai/gpt-oss-20b` | 131,072 | 65,536 | main sort / replay model |
| `openai/gpt-oss-120b` | 131,072 | 65,536 | fallback; translation + labelling scripts |
| `openai/gpt-oss-safeguard-20b` | 131,072 | 65,536 | candidate for the safety LLM check (M1), to evaluate |
| `qwen/qwen3.8-27b`, `allam-2-7b` | — | — | not used |
| `whisper-large-v3(-turbo)` | — | — | possible dictation (not planned) |
| `meta-llama/llama-prompt-guard-2-*`, `canopylabs/orpheus-*` | — | — | not used |

**No embedding model** → I3 uses `Xenova/multilingual-e5-small` in the browser (`@huggingface/transformers`).

## Structured outputs (tested)

- `response_format: {type: "json_schema", json_schema: {name, strict: true, schema}}` **works** on gpt-oss-20b and 120b. Strict mode: every property in `required`, `additionalProperties: false`, optional values as `["string","null"]`. No streaming / tools with it.
- `{type: "json_object"}` works but only checks syntax: in our test the model invented its own field names (`content`, `description`) → **always use strict json_schema**, and still validate with zod.
- Reasoning: `reasoning_effort: "low" | "medium" | "high"`; `include_reasoning: false` keeps the `reasoning` field out of the response (content holds only the JSON).
- Measured on one short sort (1 sentence, `reasoning_effort: low`): 20b ≈ 430–550 ms, 120b ≈ 510–600 ms, ~170 prompt + ~95 completion tokens. Single-call numbers, not a benchmark — I1 measures p50/p90 on the deployed app.
- gpt-oss-120b answered with "Vous" once → the prompts must say "tutoie".

## Rate limits (response headers, free tier, per model)

| Header | Value | Meaning |
|---|---|---|
| `x-ratelimit-limit-requests` | 1000 | requests per **day** |
| `x-ratelimit-limit-tokens` | 8000 | tokens per **minute** |
| `x-ratelimit-reset-requests` | e.g. `1m26.4s` | time until a request slot comes back |
| `x-ratelimit-reset-tokens` | e.g. `3.5s` | time until the TPM window refills |
| `retry-after` | seconds | only on HTTP 429 |

Consequences:
- **8k TPM is the bottleneck.** A 12-line sort is ~1–2k tokens → only a handful of sorts per minute per model. The app must show the on-device result first and treat Groq as an upgrade (I1).
- Scripts (D1/D2 translation, labelling, E1 eval) must read `x-ratelimit-remaining-tokens` / `retry-after`, sleep, and resume from the disk cache. Run them on `gpt-oss-120b` so they do not eat the 20b budget the demo uses.
- Ayoub should use **his own Groq key** for D2/E1 so both of us are not sharing 8k TPM. On demo day nobody runs scripts on the Vercel key.
