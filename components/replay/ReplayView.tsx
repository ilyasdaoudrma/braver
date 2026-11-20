"use client";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { calibration, groupEntries, todayKey } from "@/lib/replay";
import { useNow } from "@/lib/use-now";
import { useStoreValue } from "@/lib/use-store";
import { CalibrationChart } from "./CalibrationChart";
import { ReplayEntryCard } from "./ReplayEntryCard";

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement du Replay">
      {[0, 1].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

export function ReplayView() {
  const now = useNow();
  const hydrated = now !== null;
  const [replays] = useStoreValue("replays");
  const groups = groupEntries(replays, now === null ? "" : todayKey(new Date(now)));
  const calib = calibration(replays);

  return (
    <section className="space-y-8" aria-labelledby="replay-title">
      <div className="space-y-2">
        <h1 id="replay-title" className="font-display text-3xl font-bold tracking-tight">
          Replay
        </h1>
        <p className="text-ink-2">Compare ce que ton esprit prédisait avec ce qui s&apos;est vraiment passé.</p>
      </div>

      {!hydrated ? (
        <Skeleton />
      ) : replays.length === 0 ? (
        <div className="enter space-y-4 rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
          <p className="font-bold">Aucune prédiction notée</p>
          <p className="text-ink-2">Quand une inquiétude est un scénario, note ta prédiction sur sa carte : elle reviendra ici.</p>
          <Link href="/vider" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-bold text-paper">
            <PenLine aria-hidden size={16} />
            Vider ma tête
          </Link>
        </div>
      ) : (
        <>
          {groups.due.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold">
                À vérifier <span className="text-ink-2">· {groups.due.length}</span>
              </h2>
              {groups.due.map((e) => (
                <ReplayEntryCard key={e.id} entry={e} due />
              ))}
            </div>
          )}
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Ta calibration</h2>
            <CalibrationChart data={calib} />
          </div>
          {groups.later.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold">
                Plus tard <span className="text-ink-2">· {groups.later.length}</span>
              </h2>
              {groups.later.map((e) => (
                <ReplayEntryCard key={e.id} entry={e} due={false} />
              ))}
            </div>
          )}
          {groups.done.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold">
                Déjà vérifiées <span className="text-ink-2">· {groups.done.length}</span>
              </h2>
              {groups.done.map((e) => (
                <ReplayEntryCard key={e.id} entry={e} due={false} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
