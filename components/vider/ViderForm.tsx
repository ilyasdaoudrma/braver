"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { MAX_CHARS, MAX_LINES } from "@/lib/sort/api";
import { startSort } from "@/lib/sort/session";
import { useStoreValue } from "@/lib/use-store";

const EXAMPLE = [
  "Je vais rater mon entretien demain, j'en suis sûr.",
  "Mazal ma siftsh dossier dyal la bourse.",
  "ما بقيتش قادر نقرا، كنأجل كلشي",
  "Bba khrjouh mn lkhedma.",
].join("\n");

function validate(raw: string): string | null {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > MAX_LINES) return `${lines.length} lignes : garde les ${MAX_LINES} plus importantes.`;
  const long = lines.findIndex((l) => l.length > MAX_CHARS);
  if (long >= 0) return `La ligne ${long + 1} dépasse ${MAX_CHARS} caractères : coupe-la en deux.`;
  return null;
}

export function ViderForm() {
  const router = useRouter();
  const fieldId = useId();
  const [settings] = useStoreValue("settings");
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const error = validate(text);
  const count = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const canSort = count > 0 && !error;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSort) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const outcome = startSort(lines, { tone: settings.tone, confirmedSafe: false, forceLocal: settings.forceLocal });
    router.push(outcome.alert ? "/securite" : "/tri");
  }

  return (
    <form onSubmit={handleSubmit} className="enter space-y-6" noValidate>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Vide ta tête</h1>
        <p className="text-ink-2">Écris ce qui t&apos;inquiète. Une inquiétude par ligne, en français ou en darija.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={fieldId} className="block font-bold">
          Ce qui t&apos;inquiète
        </label>
        <textarea
          id={fieldId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={7}
          dir="auto"
          placeholder={"Je vais rater mon exposé…\nMazal ma siftsh dossier…"}
          aria-invalid={Boolean(error) && touched}
          aria-describedby={`${fieldId}-hint ${fieldId}-error`}
          className={`w-full resize-y rounded-2xl border bg-surface p-4 leading-relaxed text-ink placeholder:text-ink-2/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
            error && touched ? "border-danger" : "border-line"
          }`}
        />
        <div className="flex justify-between gap-3 text-sm">
          <p id={`${fieldId}-hint`} className="text-ink-2">
            {count} / {MAX_LINES} lignes
          </p>
          <button type="button" onClick={() => setText(EXAMPLE)} className="inline-flex items-center gap-1 font-bold text-ink-2 underline-offset-4 hover:underline">
            <Sparkles aria-hidden size={14} />
            Charger l&apos;exemple
          </button>
        </div>
        <p id={`${fieldId}-error`} role="alert" className="min-h-5 text-sm text-danger">
          {touched ? error : null}
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSort}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-bold text-paper transition-[opacity,transform] duration-200 ease-out active:scale-[0.98] disabled:opacity-40"
      >
        Trier mes inquiétudes
        <ArrowRight aria-hidden size={18} />
      </button>
    </form>
  );
}
