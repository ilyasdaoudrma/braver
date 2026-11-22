"use client";
import { useId, useState } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Trash2 } from "lucide-react";
import { aiRequestParts } from "@/lib/ai/client";
import { AI_PROVIDER_IDS, AI_PROVIDERS, DEFAULT_AI_SETTINGS, isSafeBaseUrl, isValidKey, type AiProviderId, type AiSettings } from "@/lib/ai/providers";
import { useStoreValue } from "@/lib/use-store";
import type { AiCheckResponse } from "@/app/api/ai-check/route";

type Check = { state: "idle" } | { state: "checking" } | { state: "ok"; count: number } | { state: "error"; message: string; canSaveAnyway: boolean };

const mask = (key: string): string => (key.length > 8 ? `••••${key.slice(-4)}` : "••••");

/** "Ta clé d'IA": bring your own key. Stored on this device only; sent with each sort request, never kept by the server. */
export function AiKeySetting() {
  const [saved, setSaved] = useStoreValue("ai");
  const [draft, setDraft] = useState<AiSettings>(() => (saved.provider === "none" ? { ...DEFAULT_AI_SETTINGS, provider: "groq" } : saved));
  const [showKey, setShowKey] = useState(false);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [models, setModels] = useState<string[]>([]);
  const ids = { key: useId(), model: useId(), url: useId(), list: useId(), keyErr: useId(), urlErr: useId() };

  const provider = draft.provider === "none" ? null : AI_PROVIDERS[draft.provider];
  const keyError = draft.key && !isValidKey(draft.key.trim()) ? "Cette clé contient des espaces ou est trop courte." : null;
  const urlError =
    draft.provider === "custom" && draft.baseUrl && !isSafeBaseUrl(draft.baseUrl.trim())
      ? "Adresse https publique uniquement (pas d'IP ni d'adresse locale)."
      : null;
  const canTest = provider !== null && isValidKey(draft.key.trim()) && !urlError && (draft.provider !== "custom" || (draft.baseUrl && draft.model));
  const isSaved = saved.provider !== "none" && saved.key !== "";

  function pick(id: AiProviderId) {
    setDraft((d) => ({ ...d, provider: id, model: "", baseUrl: id === "custom" ? d.baseUrl : "" }));
    setModels([]);
    setCheck({ state: "idle" });
  }

  function save(s: AiSettings) {
    setSaved(() => ({ provider: s.provider, key: s.key.trim(), model: s.model.trim(), baseUrl: s.baseUrl.trim() }));
  }

  async function testAndSave() {
    const label = provider?.label ?? "le fournisseur";
    const parts = aiRequestParts({ ...draft, key: draft.key.trim(), model: draft.model.trim(), baseUrl: draft.baseUrl.trim() });
    if (!parts.ai) {
      setCheck({ state: "error", message: "Vérifie la clé, le modèle et l'adresse.", canSaveAnyway: false });
      return;
    }
    setCheck({ state: "checking" });
    try {
      const res = await fetch("/api/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...parts.headers },
        body: JSON.stringify({ ai: parts.ai }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = (await res.json()) as AiCheckResponse;
      if (data.ok) {
        setModels(data.models);
        save(draft);
        setCheck({ state: "ok", count: data.models.length });
      } else if (data.error === "key_rejected") {
        setCheck({ state: "error", message: `Clé refusée par ${label}. Vérifie-la ou crée-en une nouvelle.`, canSaveAnyway: false });
      } else if (data.error === "rate_limited") {
        setCheck({ state: "error", message: "Trop d'essais. Réessaie dans une minute.", canSaveAnyway: false });
      } else {
        setCheck({ state: "error", message: `Impossible de joindre ${label} pour vérifier la clé.`, canSaveAnyway: true });
      }
    } catch {
      setCheck({ state: "error", message: "Pas de réseau pour vérifier la clé.", canSaveAnyway: true });
    }
  }

  function remove() {
    setSaved(() => ({ ...DEFAULT_AI_SETTINGS }));
    setDraft({ ...DEFAULT_AI_SETTINGS, provider: "groq" });
    setModels([]);
    setCheck({ state: "idle" });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4" aria-labelledby={`${ids.key}-title`}>
      <div className="space-y-1">
        <h2 id={`${ids.key}-title`} className="flex items-center gap-2 font-bold">
          <KeyRound aria-hidden size={18} />
          Ta clé d&apos;IA (optionnel)
        </h2>
        <p className="text-sm text-ink-2">
          BRAVER marche sans clé : le tri et la sécurité tournent sur ton téléphone. Avec ta propre clé, une IA affine le tri.
          Ta clé reste sur ce téléphone et part seulement avec une demande de tri : notre serveur ne la garde jamais.
        </p>
      </div>

      {isSaved && (
        <p className="enter flex items-center gap-2 rounded-xl bg-acceptation-soft px-3 py-2 text-sm text-acceptation" role="status">
          <CheckCircle2 aria-hidden size={16} />
          Clé active : {AI_PROVIDERS[saved.provider as AiProviderId].label} · {saved.model || AI_PROVIDERS[saved.provider as AiProviderId].defaultModel} ·{" "}
          {mask(saved.key)}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Fournisseur</legend>
        <div className="flex flex-wrap gap-2">
          {AI_PROVIDER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={draft.provider === id}
              onClick={() => pick(id)}
              className={`min-h-11 rounded-full border px-3.5 text-sm font-bold ${
                draft.provider === id ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-ink/40"
              }`}
            >
              {AI_PROVIDERS[id].label}
            </button>
          ))}
        </div>
      </fieldset>

      {provider && (
        <div className="space-y-4">
          {draft.provider === "custom" && (
            <div className="space-y-1.5">
              <label htmlFor={ids.url} className="block text-sm font-bold">
                Adresse de l&apos;API
              </label>
              <input
                id={ids.url}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={draft.baseUrl}
                onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                placeholder="https://api.together.xyz/v1"
                aria-invalid={Boolean(urlError)}
                aria-describedby={ids.urlErr}
                className={`min-h-12 w-full rounded-xl border bg-paper px-3 ${urlError ? "border-danger" : "border-line"}`}
              />
              <p id={ids.urlErr} className="min-h-4 text-sm text-danger">
                {urlError}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={ids.key} className="block text-sm font-bold">
                Ta clé {provider.label}
              </label>
              {provider.keyUrl && (
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-focus underline-offset-4 hover:underline">
                  Créer une clé
                  <ExternalLink aria-hidden size={14} />
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id={ids.key}
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={draft.key}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, key: e.target.value }));
                  setCheck({ state: "idle" });
                }}
                placeholder="Colle ta clé ici"
                aria-invalid={Boolean(keyError) || (check.state === "error" && !check.canSaveAnyway)}
                aria-describedby={`${ids.key}-hint ${ids.keyErr}`}
                className={`min-h-12 min-w-0 flex-1 rounded-xl border bg-paper px-3 font-mono text-sm ${keyError ? "border-danger" : "border-line"}`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Masquer la clé" : "Afficher la clé"}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-line bg-paper"
              >
                {showKey ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
              </button>
            </div>
            <p id={`${ids.key}-hint`} className="text-sm text-ink-2">
              {provider.keyHint}
            </p>
            <p id={ids.keyErr} className="min-h-4 text-sm text-danger">
              {keyError}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={ids.model} className="block text-sm font-bold">
              Modèle
            </label>
            <input
              id={ids.model}
              list={ids.list}
              autoComplete="off"
              spellCheck={false}
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
              placeholder={provider.defaultModel || "nom-du-modèle"}
              className="min-h-12 w-full rounded-xl border border-line bg-paper px-3 font-mono text-sm"
            />
            <datalist id={ids.list}>
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="text-sm text-ink-2">
              {provider.defaultModel ? `Laisse vide pour ${provider.defaultModel}.` : "Obligatoire pour « Autre »."}
              {models.length > 0 && ` ${models.length} modèles proposés par ta clé.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={testAndSave}
              disabled={!canTest || check.state === "checking"}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 font-bold text-paper disabled:opacity-40"
            >
              {check.state === "checking" && <Loader2 aria-hidden size={16} className="animate-spin motion-reduce:animate-none" />}
              Tester et enregistrer
            </button>
            {check.state === "error" && check.canSaveAnyway && (
              <button
                type="button"
                onClick={() => {
                  save(draft);
                  setCheck({ state: "idle" });
                }}
                className="min-h-12 rounded-full border border-ink/20 px-5 font-bold"
              >
                Enregistrer quand même
              </button>
            )}
            {isSaved && (
              <button
                type="button"
                onClick={remove}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-danger px-5 font-bold text-danger"
              >
                <Trash2 aria-hidden size={16} />
                Retirer ma clé
              </button>
            )}
          </div>

          <p role="status" aria-live="polite" className="min-h-5 text-sm">
            {check.state === "ok" && (
              <span className="inline-flex items-center gap-1.5 font-bold text-acceptation">
                <CheckCircle2 aria-hidden size={16} />
                Clé valide et enregistrée{check.count > 0 ? ` · ${check.count} modèles disponibles` : ""}.
              </span>
            )}
            {check.state === "error" && <span className="font-bold text-danger">{check.message}</span>}
          </p>
        </div>
      )}
    </section>
  );
}
