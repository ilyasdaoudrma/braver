import { FlaskConical } from "lucide-react";
import { TryPhrase } from "./TryPhrase";

// Shape of public/labo/metrics.json (written by ml/eval/report.py). Everything optional: older files still render.
interface SafetyM {
  n: number;
  accuracy: number | null;
  danger: { precision: number; recall: number; f1: number };
  no_danger: { precision: number; recall: number; f1: number };
  macro_f1: number;
  confusion: number[][];
}
interface ZoneM {
  n: number;
  accuracy: number | null;
  macro_f1: number;
  per_class: Record<string, { precision: number; recall: number; f1: number }>;
  confusion: number[][];
}
interface SetEntry {
  name: string;
  n: number;
  llm_missing?: number;
  safety_device?: Record<string, SafetyM>;
  safety_pipeline?: Record<string, SafetyM>;
  zones_device?: Record<string, ZoneM>;
  zones_pipeline?: Record<string, ZoneM>;
}
export interface LaboMetrics {
  date: string;
  sets: Record<string, SetEntry>;
  latency?: { requests: number; client_ms_p50: number; client_ms_p90: number; answered_by: Record<string, number> };
  models?: Record<string, { model: string; train_n: number; val_n: number; test?: { n: number } }>;
}

const ZONES = ["scenario", "action", "acceptation"];
const LANG: Record<string, string> = { all: "Toutes", fr: "Français", darija_latn: "Darija (latin)", darija_arab: "Darija (arabe)", en: "Anglais" };
/** Four decimals, never rounded up (truncated). */
const f = (x: number | null | undefined) => (x === null || x === undefined ? "–" : (Math.floor(x * 10000 + 1e-9) / 10000).toFixed(4).replace(".", ","));

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[22rem] text-left text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-2 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-2 py-1.5 font-bold">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-2 py-1.5">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Confusion({ m, labels, title }: { m: number[][]; labels: string[]; title: string }) {
  return (
    <Table
      caption={`Matrice de confusion, ${title} (lignes : vrai, colonnes : prédit)`}
      head={["vrai \\ prédit", ...labels]}
      rows={m.map((row, i) => [labels[i], ...row])}
    />
  );
}

function SafetyBlock({ title, data }: { title: string; data: Record<string, SafetyM> }) {
  return (
    <div className="space-y-2">
      <h4 className="font-bold">{title}</h4>
      <Table
        caption={`${title}, par langue`}
        head={["Langue", "n", "Rappel danger", "Précision danger", "F1 danger", "Macro F1"]}
        rows={Object.entries(data).map(([k, m]) => [LANG[k] ?? k, m.n, f(m.danger.recall), f(m.danger.precision), f(m.danger.f1), f(m.macro_f1)])}
      />
      <Confusion m={data.all.confusion} labels={["pas danger", "danger"]} title={title} />
    </div>
  );
}

function ZoneBlock({ title, data }: { title: string; data: Record<string, ZoneM> }) {
  return (
    <div className="space-y-2">
      <h4 className="font-bold">{title}</h4>
      <Table
        caption={`${title}, par langue`}
        head={["Langue", "n", "Exactitude", "Macro F1", ...ZONES.map((z) => `F1 ${z}`)]}
        rows={Object.entries(data).map(([k, m]) => [LANG[k] ?? k, m.n, f(m.accuracy), f(m.macro_f1), ...ZONES.map((z) => f(m.per_class[z]?.f1))])}
      />
      <Confusion m={data.all.confusion} labels={ZONES} title={title} />
    </div>
  );
}

export function LaboView({ metrics }: { metrics: LaboMetrics | null }) {
  return (
    <section className="enter space-y-8" aria-labelledby="labo-title">
      <div className="space-y-2">
        <h1 id="labo-title" className="font-display text-3xl font-bold tracking-tight">
          Labo
        </h1>
        <p className="text-ink-2">
          Ce que nos modèles valent vraiment, mesuré sur des phrases jamais vues à l&apos;entraînement. Chaque chiffre donne son n et n&apos;est jamais arrondi à
          la hausse.
        </p>
      </div>

      <TryPhrase />

      {!metrics ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
          <FlaskConical aria-hidden size={20} className="mx-auto mb-2 text-ink-2" />
          <p className="font-bold">Pas encore de mesure publiée</p>
          <p className="text-sm text-ink-2">Lance ml/eval/report.py pour remplir cette page.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-2">
            Mesure du {metrics.date}. « Sur le téléphone » = l&apos;app sans réseau (une phrase ambiguë déclenche l&apos;aide). « App en ligne » = mots-clés +
            modèle puis l&apos;IA, sur un échantillon stratifié envoyé à l&apos;app déployée (12 phrases par langue et par classe : la
            précision n&apos;y reflète pas la fréquence réelle). Les zones « en ligne » ne comptent que les phrases que l&apos;app n&apos;a pas
            arrêtées pour la sécurité.
          </p>
          {metrics.latency?.requests ? (
            <p className="rounded-xl bg-surface-2 p-3 text-sm">
              Temps de réponse de l&apos;IA par requête de 12 lignes ({metrics.latency.requests} requêtes) : médiane {Math.round(metrics.latency.client_ms_p50)} ms, 90 % sous{" "}
              {Math.round(metrics.latency.client_ms_p90)} ms. Répondu par :{" "}
              {Object.entries(metrics.latency.answered_by)
                .map(([k, v]) => `${k.split("/").pop()} ${v}`)
                .join(", ")}
              .
            </p>
          ) : null}
          {Object.entries(metrics.sets).map(([key, s]) => (
            <article key={key} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
              <h2 className="font-display text-xl font-bold">
                {s.name} <span className="text-ink-2">· n = {s.n}</span>
              </h2>
              {Boolean(s.llm_missing) && (
                <p className="text-sm text-ink-2">{s.llm_missing} phrase(s) de l&apos;échantillon sans réponse de l&apos;IA : comptées comme l&apos;app les traite (phrase ambiguë → aide, sinon la carte du téléphone).</p>
              )}
              {s.safety_pipeline && <SafetyBlock title="Sécurité — app en ligne" data={s.safety_pipeline} />}
              {s.safety_device && <SafetyBlock title="Sécurité — sur le téléphone" data={s.safety_device} />}
              {s.zones_pipeline && <ZoneBlock title="Zones — app en ligne" data={s.zones_pipeline} />}
              {s.zones_device && <ZoneBlock title="Zones — sur le téléphone" data={s.zones_device} />}
            </article>
          ))}
          {metrics.models && (
            <article className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
              <h2 className="font-display text-xl font-bold">Données d&apos;entraînement</h2>
              <ul className="list-disc space-y-1 pl-5">
                {Object.entries(metrics.models).map(([k, m]) => (
                  <li key={k}>
                    {k === "safety" ? "Sécurité" : "Zones"} ({m.model}) : {m.train_n} phrases d&apos;entraînement, {m.val_n} de validation, {m.test?.n ?? "–"} de
                    test.
                  </li>
                ))}
              </ul>
              <p className="text-ink-2">
                Les phrases en français et en darija du jeu de test sont traduites ou générées par une IA (marquées « synthétique »), pas écrites par de vrais
                utilisateurs. Détails : ml/safety/DATA_CARD.md et ml/zones/DATA_CARD.md.
              </p>
            </article>
          )}
        </>
      )}
    </section>
  );
}
