"use client";
import { useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import {
  dashboard,
  PERIODS,
  type Dashboard,
  type Period,
} from "@/lib/dashboard";
import { worstSentence } from "@/lib/replay";
import { useNow } from "@/lib/use-now";
import { useStoreValue } from "@/lib/use-store";
import { ZONE_LABEL } from "@/components/tri/zones";
import { ZONES } from "@/lib/types";

const ZONE_BAR = {
  scenario: "bg-scenario",
  action: "bg-action",
  acceptation: "bg-acceptation",
} as const;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="enter space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-2">{children}</p>;
}

function MoodLine({
  d,
  period,
  now,
}: {
  d: Dashboard;
  period: Period;
  now: number;
}) {
  if (!d.moods.length)
    return (
      <Empty>
        Pas encore d&apos;humeur notée sur cette période. Note-la depuis
        l&apos;accueil.
      </Empty>
    );
  const span = PERIODS.find((p) => p.id === period)!.ms;
  const end = now;
  const W = 300;
  const H = 96;
  const x = (iso: string) =>
    ((Date.parse(iso) - (end - span)) / span) * (W - 12) + 6;
  const y = (level: number) => H - 8 - ((level - 1) / 4) * (H - 16);
  const path = d.moods
    .map(
      (m, i) =>
        `${i ? "L" : "M"}${x(m.at).toFixed(1)},${y(m.level).toFixed(1)}`,
    )
    .join(" ");
  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full"
        role="img"
        aria-label={`Humeur moyenne ${d.moodMean?.toFixed(1).replace(".", ",")} sur 5, ${d.moods.length} relevés`}
      >
        {[1, 3, 5].map((l) => (
          <line
            key={l}
            x1="0"
            x2={W}
            y1={y(l)}
            y2={y(l)}
            className="stroke-line"
            strokeDasharray="3 4"
          />
        ))}
        <path
          d={path}
          fill="none"
          className="stroke-ink"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {d.moods.map((m) => (
          <circle
            key={m.at}
            cx={x(m.at)}
            cy={y(m.level)}
            r="3.5"
            className="fill-ink"
          />
        ))}
      </svg>
      <figcaption className="text-sm text-ink-2">
        {d.moods.length} relevé{d.moods.length > 1 ? "s" : ""} · moyenne{" "}
        {d.moodMean?.toFixed(1).replace(".", ",")} / 5 (1 = très mal, 5 = très
        bien)
      </figcaption>
    </figure>
  );
}

function Zones({ d }: { d: Dashboard }) {
  if (!d.worries)
    return <Empty>Aucune inquiétude triée sur cette période.</Empty>;
  return (
    <ul className="space-y-2">
      {ZONES.map((z) => (
        <li
          key={z}
          className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm"
        >
          <span className="font-bold">{ZONE_LABEL[z]}</span>
          <span className="h-3 overflow-hidden rounded-full bg-surface-2">
            <span
              className={`block h-full rounded-full ${ZONE_BAR[z]}`}
              style={{ width: `${(d.zones[z] / d.worries) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{d.zones[z]}</span>
        </li>
      ))}
    </ul>
  );
}

function Gad7Trend({ d }: { d: Dashboard }) {
  if (!d.gad7.length) {
    return (
      <Empty>
        Pas de questionnaire sur cette période.{" "}
        <Link href="/gad7" className="font-bold underline underline-offset-4">
          Le faire maintenant
        </Link>
      </Empty>
    );
  }
  return (
    <ol
      className="flex items-end gap-2"
      aria-label="Scores du questionnaire, du plus ancien au plus récent"
    >
      {d.gad7.map((g) => (
        <li
          key={g.at}
          className="flex flex-1 flex-col items-center gap-1 text-xs"
        >
          <span className="font-bold tabular-nums">{g.score}</span>
          <span
            className="w-full rounded-t-md bg-ink-2/60"
            style={{ height: `${Math.max(4, (g.score / 21) * 72)}px` }}
            aria-hidden
          />
          <span className="text-ink-2">
            {new Date(g.at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SuiviView() {
  const now = useNow();
  const [period, setPeriod] = useState<Period>("7j");
  const [moods] = useStoreValue("moods");
  const [worries] = useStoreValue("worries");
  const [replays] = useStoreValue("replays");
  const [breathing] = useStoreValue("breathing");
  const [gad7] = useStoreValue("gad7");
  const d =
    now === null
      ? null
      : dashboard(
          { moods, worries, replays, breathing, gad7 },
          period,
          new Date(now),
        );

  return (
    <section className="space-y-5" aria-labelledby="suivi-title">
      <h1
        id="suivi-title"
        className="font-display text-3xl font-bold tracking-tight"
      >
        Suivi
      </h1>
      <div
        className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1"
        role="radiogroup"
        aria-label="Période"
      >
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`min-h-10 rounded-full text-sm font-bold transition-colors duration-200 ${period === p.id ? "bg-ink text-paper" : "text-ink-2"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {d === null || now === null ? (
        <div
          className="space-y-3"
          aria-busy="true"
          aria-label="Chargement du suivi"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <>
          {d.hasDemo && (
            <p className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <FlaskConical aria-hidden size={16} />
              Contient la démo fictive de Yassine (à effacer dans Plus).
            </p>
          )}
          <Card title="Humeur">
            <MoodLine d={d} period={period} now={now} />
          </Card>
          <Card title="Tes inquiétudes par zone">
            <Zones d={d} />
          </Card>
          <Card title="Petites étapes faites">
            {d.actions || d.stepsDone ? (
              <p>
                <span className="font-display text-3xl font-bold tabular-nums">
                  {d.stepsDone}
                </span>{" "}
                <span className="text-ink-2">
                  étape{d.stepsDone > 1 ? "s" : ""} faite
                  {d.stepsDone > 1 ? "s" : ""} sur cette période
                </span>
              </p>
            ) : (
              <Empty>Aucune action sur cette période.</Empty>
            )}
          </Card>
          <Card title="Ce que disent tes prédictions">
            <p className="text-sm">
              {worstSentence(d.calibration) ??
                "Aucune prédiction vérifiée sur cette période."}
            </p>
          </Card>
          <Card title="Respiration">
            {d.breathing.sessions ? (
              <p className="text-sm">
                {d.breathing.sessions} séance
                {d.breathing.sessions > 1 ? "s" : ""}, {d.breathing.minutes} min
                au total.
                {d.breathing.rated > 0 &&
                  ` Humeur meilleure après ${d.breathing.better} séance${d.breathing.better > 1 ? "s" : ""} sur ${d.breathing.rated}.`}
              </p>
            ) : (
              <Empty>Pas de séance sur cette période.</Empty>
            )}
          </Card>
          <Card title="Questionnaire de la semaine">
            <Gad7Trend d={d} />
          </Card>
        </>
      )}
    </section>
  );
}
