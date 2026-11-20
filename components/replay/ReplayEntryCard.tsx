"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { fetchComment } from "@/lib/replay";
import { checkSafety } from "@/lib/safety/pipeline";
import { getSafetyModel } from "@/lib/safety/model";
import type { ReplayEntry, WorstHappened } from "@/lib/types";
import { useStoreValue } from "@/lib/use-store";

const WORST: { value: WorstHappened; label: string }[] = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
  { value: "en_partie", label: "En partie" },
];

const WORST_LABEL: Record<WorstHappened, string> = {
  oui: "Le pire est arrivé",
  non: "Le pire n'est pas arrivé",
  en_partie: "En partie",
};

export function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function DoneBody({ entry }: { entry: ReplayEntry }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-ink-2">
        {entry.worstHappened ? WORST_LABEL[entry.worstHappened] : null}
      </p>
      <p dir="auto">{entry.outcome}</p>
      {entry.comment && (
        <p className="flex gap-2 rounded-xl bg-surface-2 p-3 text-[0.95rem]">
          {entry.commentSource === "llm" ? (
            <Sparkles aria-hidden size={16} className="mt-1 shrink-0" />
          ) : (
            <Cpu aria-hidden size={16} className="mt-1 shrink-0" />
          )}
          <span dir="auto">{entry.comment}</span>
        </p>
      )}
    </div>
  );
}

/** One prediction. Pending → "Raconter ce qui s'est passé" opens the comparison form. */
export function ReplayEntryCard({
  entry,
  due,
}: {
  entry: ReplayEntry;
  due: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [, updateReplays] = useStoreValue("replays");
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [worst, setWorst] = useState<WorstHappened | null>(null);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const outcomeError =
    touched && !outcome.trim()
      ? "Écris en une phrase ce qui s'est passé."
      : null;
  const worstError = touched && !worst ? "Choisis une réponse." : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!outcome.trim() || !worst || sending) return;
    // Safety first (CLAUDE.md): the outcome is checked on the device before anything is sent.
    // Danger or an unresolved doubt opens the safety screen; nothing is sent, nothing is saved.
    const safety = checkSafety(outcome, getSafetyModel()).level;
    if (safety === "danger" || safety === "check") {
      router.push("/securite");
      return;
    }
    setSending(true);
    const r = await fetchComment(entry, outcome.trim().slice(0, 600), worst);
    setOffline(r.source === "device");
    updateReplays((list) =>
      list.map((x) =>
        x.id === entry.id
          ? {
              ...x,
              status: "done",
              outcome: outcome.trim().slice(0, 600),
              worstHappened: worst,
              comment: r.comment,
              commentSource: r.source,
            }
          : x,
      ),
    );
    setSending(false);
  }

  return (
    <article className="enter space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-scenario-soft px-2 py-0.5 text-scenario">
          Sûr·e à {entry.certainty} %
        </span>
        <span className="text-ink-2">
          {entry.status === "done"
            ? `Notée le ${formatDay(entry.createdAt)}`
            : due
              ? "À vérifier maintenant"
              : `À vérifier le ${formatDay(entry.checkAt)}`}
        </span>
        {entry.demo && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">
            Exemple
          </span>
        )}
      </div>
      <p dir="auto" className="font-bold">
        {entry.prediction}
      </p>
      <p dir="auto" className="text-sm text-ink-2">
        Tu avais écrit : « {entry.text} »
      </p>
      {entry.status === "done" && <DoneBody entry={entry} />}
      {offline && entry.status === "done" && (
        <p className="text-xs text-ink-2">
          L&apos;IA n&apos;a pas répondu : commentaire fait sur ton téléphone.
        </p>
      )}

      {entry.status === "pending" && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-bold ${due ? "bg-ink text-paper" : "border border-ink/20"}`}
        >
          <MessageSquareText aria-hidden size={16} />
          Raconter ce qui s&apos;est passé
        </button>
      )}

      {entry.status === "pending" && open && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="enter space-y-4 rounded-xl bg-surface-2 p-3"
        >
          {entry.question && (
            <p className="text-sm text-ink-2">{entry.question}</p>
          )}
          <div className="space-y-2">
            <label htmlFor={`${id}-o`} className="block font-bold">
              Ce qui s&apos;est vraiment passé
            </label>
            <textarea
              id={`${id}-o`}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={3}
              maxLength={600}
              dir="auto"
              placeholder="J'ai fait l'entretien, ils m'ont rappelé…"
              aria-invalid={Boolean(outcomeError)}
              aria-describedby={`${id}-oe`}
              className={`w-full rounded-xl border bg-surface p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${outcomeError ? "border-danger" : "border-line"}`}
            />
            <p
              id={`${id}-oe`}
              className="min-h-5 text-sm text-danger"
              role="alert"
            >
              {outcomeError}
            </p>
          </div>
          <fieldset className="space-y-2" aria-describedby={`${id}-we`}>
            <legend className="font-bold">
              Le pire que tu prévoyais est-il arrivé ?
            </legend>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
              {WORST.map((w) => (
                <label
                  key={w.value}
                  className={`flex min-h-10 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                    worst === w.value ? "bg-scenario text-paper" : "text-ink-2"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-w`}
                    value={w.value}
                    checked={worst === w.value}
                    onChange={() => setWorst(w.value)}
                    className="sr-only"
                  />
                  {w.label}
                </label>
              ))}
            </div>
            <p
              id={`${id}-we`}
              className="min-h-5 text-sm text-danger"
              role="alert"
            >
              {worstError}
            </p>
          </fieldset>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-scenario px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-60"
          >
            {sending && (
              <Loader2
                aria-hidden
                size={16}
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {sending ? "Comparaison…" : "Comparer avec ma prédiction"}
          </button>
        </form>
      )}
    </article>
  );
}
