import type { Calibration } from "@/lib/replay";
import { worstSentence } from "@/lib/replay";

/**
 * For each certainty band: how sure the person was (outline bar, mean certainty) and how often the worst really
 * happened (filled bar, exact count). Everything comes from their own checked predictions.
 */
export function CalibrationChart({ data }: { data: Calibration }) {
  const sentence = worstSentence(data);
  if (!sentence) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-center text-ink-2">
        Le graphique apparaît après ta première prédiction vérifiée.
      </div>
    );
  }
  const rows = data.buckets.filter((b) => b.n > 0);
  return (
    <figure className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <figcaption className="font-bold">
        {sentence}
        {data.demo && (
          <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
            Exemple · démo de Yassine
          </span>
        )}
      </figcaption>
      <ul
        className="space-y-3"
        aria-label="Certitude et ce qui est arrivé, par tranche"
      >
        {rows.map((b) => {
          const happened = (b.worst / b.n) * 100;
          return (
            <li key={b.from} className="space-y-1">
              <p className="flex justify-between text-sm">
                <span className="font-bold">
                  Sûr·e à {b.from}–{b.to} %
                </span>
                <span className="text-ink-2 tabular-nums">
                  le pire : {b.worst} fois sur {b.n}
                </span>
              </p>
              <div
                className="relative h-5 overflow-hidden rounded-full bg-surface-2"
                aria-hidden
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full border-2 border-scenario"
                  style={{ width: `${b.meanCertainty ?? 0}%` }}
                />
                <div
                  className="absolute inset-y-1 left-1 rounded-full bg-scenario"
                  style={{
                    width: `calc(${happened}% - 0.5rem)`,
                    minWidth: b.worst ? "0.5rem" : 0,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-full border-2 border-scenario"
          />{" "}
          ta certitude moyenne
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-full bg-scenario"
          />{" "}
          ce qui est vraiment arrivé
        </span>
      </p>
    </figure>
  );
}
