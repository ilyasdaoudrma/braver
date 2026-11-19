// Labo : mesurer le tri et la sécurité avant de citer un chiffre au jury.
import { TEST_PHRASES, BLIND_PHRASES } from "./data.js";
import { sortWorries } from "./engine.js";
import { esc } from "./text.js";

export const labo = { set: "dossier", engine: "local", running: false, done: 0, total: 0, results: null, custom: "", noFilter: false, ranWith: null };

const ALIAS = {
  scenario: "scenario", "scénario": "scenario", s: "scenario",
  action: "action", a: "action",
  acceptation: "acceptation", acceptance: "acceptation", acc: "acceptation",
  securite: "securite", "sécurité": "securite", danger: "securite", alerte: "securite", crise: "securite",
};

function parseCustom(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [phrase, zone] = l.split("|").map((x) => x.trim());
      const z = ALIAS[(zone || "").toLowerCase()];
      return { n: i + 1, texte: phrase, langue: "", attendu: z ? [z] : null };
    })
    .filter((c) => c.texte);
}

export async function runLabo({ useAI, onProgress }) {
  const cases = labo.set === "dossier" ? TEST_PHRASES : labo.set === "aveugle" ? BLIND_PHRASES : parseCustom(labo.custom);
  if (!cases.length) return;
  labo.running = true;
  labo.done = 0;
  labo.total = cases.length;
  labo.results = null;
  labo.ranWith = { engine: useAI ? "ia" : "local", set: labo.set, noFilter: labo.noFilter };
  onProgress?.();
  const out = new Array(cases.length);
  let next = 0;
  const runOne = async (i) => {
    const c = cases[i];
    const t0 = performance.now();
    const res = await sortWorries([c.texte], { mode: "direct", useAI, history: [], localFilter: !labo.noFilter });
    const obtenu = res.alert ? "securite" : res.items[0]?.zone;
    const corr = res.items[0]?.corrections || [];
    out[i] = {
      ...c,
      obtenu,
      ok: c.attendu ? c.attendu.includes(obtenu) : null,
      par: res.alert ? res.alert.source : res.source === "ia" ? "IA" : "règles locales",
      repli: useAI && Boolean(res.fallback),
      reassurance: corr.filter((x) => x.startsWith("réassurance")).length,
      ironieHorsZone: corr.filter((x) => x.startsWith("ironie")).length,
      ms: performance.now() - t0,
    };
    labo.done++;
    onProgress?.();
  };
  if (useAI) {
    // Une phrase à la fois, espacées : l'offre gratuite de l'IA limite le nombre de requêtes par minute.
    for (let i = 0; i < cases.length; i++) {
      const t = performance.now();
      await runOne(i);
      const wait = 4500 - (performance.now() - t);
      if (wait > 0 && i < cases.length - 1) await new Promise((r) => setTimeout(r, wait));
    }
  } else {
    const worker = async () => {
      while (next < cases.length) await runOne(next++);
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  labo.results = out;
  labo.running = false;
}

export function metrics(results) {
  const scored = results.filter((r) => r.attendu && !r.info);
  const danger = scored.filter((r) => r.attendu[0] === "securite" && r.attendu.length === 1);
  const calm = scored.filter((r) => !r.attendu.includes("securite"));
  const tri = scored.filter((r) => !(r.attendu[0] === "securite" && r.attendu.length === 1));
  return {
    tri: { ok: tri.filter((r) => r.ok).length, n: tri.length },
    alertes: { ok: danger.filter((r) => r.obtenu === "securite").length, n: danger.length },
    fausses: { k: calm.filter((r) => r.obtenu === "securite").length, n: calm.length },
    reassurance: results.reduce((s, r) => s + r.reassurance, 0),
    ironie: results.reduce((s, r) => s + r.ironieHorsZone, 0),
    replis: results.filter((r) => r.repli).length,
    ms: results.length ? results.reduce((s, r) => s + r.ms, 0) / results.length : 0,
  };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const ZN = { scenario: "Scénario", action: "Action", acceptation: "Acceptation", securite: "Sécurité" };

export function laboSummaryText(model) {
  if (!labo.results) return "";
  const m = metrics(labo.results);
  const w = labo.ranWith;
  const set = w.set === "dossier" ? "les 21 phrases du dossier" : w.set === "aveugle" ? "24 phrases écrites à l'aveugle" : `${labo.results.length} phrases jamais vues par l'équipe`;
  const eng = w.engine === "ia" ? `IA (${model})${w.noFilter ? ", sans le filtre local" : ""}` : "règles locales";
  return `Test BRAVER sur ${set}, moteur ${eng} : tri correct ${m.tri.ok}/${m.tri.n} (${pct(m.tri.ok, m.tri.n)} %), alertes de danger détectées ${m.alertes.ok}/${m.alertes.n}, fausses alertes ${m.fausses.k}/${m.fausses.n}, réassurance interdite ${m.reassurance}, ironie hors zone ${m.ironie}.`;
}

export function laboView({ aiAvailable, model }) {
  const r = labo.results;
  const m = r ? metrics(r) : null;
  const warn =
    labo.set === "dossier" && labo.engine === "local"
      ? `<div class="banner warn">Les règles locales ont été écrites à partir de ces 21 phrases : leur score ne prouve rien. Pour un chiffre à citer : moteur IA + phrases jamais vues.</div>`
      : labo.set === "aveugle" && labo.engine === "local"
      ? `<div class="banner warn">Mesure honnête des règles locales sur ces phrases, faite avant tout réglage : 13/19 bons tris, 1 danger sur 5 attrapé par le filtre seul. Le filtre a été complété depuis : seul le score de l'IA reste « à l'aveugle » sur cette liste.</div>`
      : "";
  const metricsHTML = m
    ? `<div class="metrics">
        <div class="metric"><b>${m.tri.ok}/${m.tri.n}</b><span>bons tris · ${pct(m.tri.ok, m.tri.n)} %</span></div>
        <div class="metric ${m.alertes.ok === m.alertes.n ? "good" : "bad"}"><b>${m.alertes.ok}/${m.alertes.n}</b><span>dangers détectés</span></div>
        <div class="metric"><b>${m.fausses.k}/${m.fausses.n}</b><span>fausses alertes</span></div>
        <div class="metric ${m.reassurance ? "bad" : "good"}"><b>${m.reassurance}</b><span>réassurance interdite</span></div>
        <div class="metric ${m.ironie ? "bad" : "good"}"><b>${m.ironie}</b><span>ironie hors zone</span></div>
        <div class="metric"><b>${(m.ms / 1000).toFixed(1)} s</b><span>par phrase${m.replis ? ` · ${m.replis} repli(s) local` : ""}</span></div>
      </div>
      <div class="row"><button type="button" class="btn ghost" data-action="labo-copy">Copier le résultat pour le pitch</button></div>
      <div class="table-wrap"><table class="results">
        <thead><tr><th>#</th><th>Phrase</th><th>Attendu</th><th>Obtenu</th><th>Par</th><th></th></tr></thead>
        <tbody>${r
          .map(
            (x) => `<tr class="${x.ok === false ? "ko" : ""}"><td>${x.n}</td><td dir="auto">${esc(x.texte)}${x.info ? ' <small>(info)</small>' : ""}</td>
              <td>${x.attendu ? x.attendu.map((a) => ZN[a]).join(" ou ") : "—"}</td><td><span class="tag t-${x.obtenu}">${ZN[x.obtenu] || "?"}</span></td>
              <td><small>${esc(x.par)}</small></td><td>${x.ok === null ? "" : x.ok ? "✓" : "✗"}${x.reassurance || x.ironieHorsZone ? " ⚠" : ""}</td></tr>`
          )
          .join("")}</tbody></table></div>`
    : "";
  return `
  <section class="hero small">
    <p class="eyebrow">Labo</p>
    <h1>Mesurer avant de citer un chiffre.</h1>
    <p class="lead">Chaque phrase passe par le vrai moteur, en mode direct : filtre de sécurité, puis tri. On compte les bons tris, les dangers détectés, la réassurance interdite et l'ironie hors zone.</p>
  </section>
  <section class="panel">
    <div class="seg-row">
      <span class="lbl">Phrases</span>
      <button type="button" class="chip ${labo.set === "dossier" ? "sel" : ""}" data-action="labo-set" data-v="dossier">21 phrases du dossier</button>
      <button type="button" class="chip ${labo.set === "aveugle" ? "sel" : ""}" data-action="labo-set" data-v="aveugle">24 phrases écrites à l'aveugle</button>
      <button type="button" class="chip ${labo.set === "custom" ? "sel" : ""}" data-action="labo-set" data-v="custom">Coller de nouvelles phrases</button>
    </div>
    <div class="seg-row">
      <span class="lbl">Moteur</span>
      <button type="button" class="chip ${labo.engine === "local" ? "sel" : ""}" data-action="labo-engine" data-v="local">Règles locales</button>
      <button type="button" class="chip ${labo.engine === "ia" ? "sel" : ""}" data-action="labo-engine" data-v="ia" ${aiAvailable ? "" : 'disabled title="IA non configurée"'}>IA${model ? ` · ${esc(model)}` : " (non configurée)"}</button>
      ${labo.engine === "ia" ? `<label class="check small"><input type="checkbox" id="labo-nofilter" ${labo.noFilter ? "checked" : ""}/> Sans le filtre local (mesurer l'IA seule)</label>` : ""}
    </div>
    ${
      labo.set === "custom"
        ? `<label class="block-label">Une phrase par ligne, suivie de la zone attendue : <code>phrase | scenario</code>, <code>action</code>, <code>acceptation</code> ou <code>danger</code>. Idéalement écrites par quelqu'un qui n'a jamais vu la liste du dossier.
            <textarea id="labo-custom" rows="7" dir="auto" placeholder="J'ai peur que mon frère ne me parle plus après la dispute | scenario&#10;Je dois appeler la scolarité pour mon relevé | action">${esc(labo.custom)}</textarea></label>`
        : ""
    }
    ${warn}
    <button type="button" class="btn primary" data-action="labo-run" ${labo.running ? "disabled" : ""}>${labo.running ? `Test en cours… ${labo.done}/${labo.total}` : "Lancer le test"}</button>
  </section>
  ${m ? `<section class="panel">${metricsHTML}</section>` : ""}`;
}
