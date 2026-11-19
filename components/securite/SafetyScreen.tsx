"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, Phone } from "lucide-react";
import { HELPLINES, TRUSTED_MESSAGE } from "@/lib/helplines";

/** Calm full screen: no jokes, no diagnosis. Moroccan numbers, a ready message, and a way back. */
export function SafetyScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(TRUSTED_MESSAGE);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/accueil");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="enter space-y-8">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">Parlons-en à quelqu&apos;un, maintenant.</h1>
          <p className="text-ink-2">
            Ce que tu traverses compte. Une personne peut t&apos;écouter tout de suite. Si tu es en danger, appelle le 19 ou le 112.
          </p>
        </header>

        <ul className="space-y-3" aria-label="Numéros d'aide au Maroc">
          {HELPLINES.map((h) => (
            <li key={h.name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex-1 space-y-0.5">
                <p className="font-bold">{h.name}</p>
                <p className="text-sm text-ink-2">{h.who}</p>
                {h.extra && <p className="text-sm text-ink-2">{h.extra}</p>}
              </div>
              {h.tel && (
                <a
                  href={`tel:${h.tel}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.97]"
                  aria-label={`Appeler ${h.name} au ${h.tel}`}
                >
                  <Phone aria-hidden size={16} />
                  {h.tel}
                </a>
              )}
            </li>
          ))}
        </ul>

        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-labelledby="msg-title">
          <h2 id="msg-title" className="font-bold">
            Message prêt pour une personne de confiance
          </h2>
          <p className="rounded-xl bg-surface-2 p-3">{TRUSTED_MESSAGE}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`sms:?&body=${encodeURIComponent(TRUSTED_MESSAGE)}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 font-bold"
            >
              <MessageCircle aria-hidden size={16} />
              Envoyer par SMS
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 font-bold"
            >
              {copied === "done" ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
              {copied === "done" ? "Copié" : "Copier le message"}
            </button>
          </div>
          {copied === "failed" && <p className="text-sm text-ink-2">La copie n&apos;a pas marché : appuie longuement sur le message pour le copier.</p>}
        </section>

        <button type="button" onClick={handleBack} className="min-h-11 w-full rounded-full px-4 font-bold text-ink-2 underline underline-offset-4">
          On s&apos;est mal compris
        </button>
      </div>
    </main>
  );
}
