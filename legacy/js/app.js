// BRAVER — interface. Vanilla JS, aucune étape de build.
import { state, save, wipe, uid, daysAgo, tomorrowISO, fmtDate } from "./store.js";
import { EXAMPLE, ZONES, HELPLINES, TRUSTED_MESSAGE, DEMO_REPLAYS, DEMO_ACTIONS, DEMO_HISTORY } from "./data.js";
import { ai, checkAI, sortWorries, fillLocal, sanitize, ironyAllowed, replayComment, aiSummary, topicsOf } from "./engine.js";
import { calibration, calibrationSVG } from "./chart.js";
import { voiceSupported, startDictation, stopDictation } from "./voice.js";
import { esc, similarity } from "./text.js";
import { labo, laboView, runLabo, laboSummaryText } from "./labo.js";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const ZKEYS = ["scenario", "action", "acceptation"];
const useAI = () => ai.available && !state.forceLocal;

// État d'interface (non sauvegardé).
const ui = {
  alert: null,
  pendingLines: [],
  cert: {},
  when: {},
  fear: {},
  timers: {},
  openReplay: null,
  listening: false,
  fresh: false,
  exercise: null,
  summaryOn: false,
  summaryAI: null,
  busy: false,
};

/* ================================================================ Icônes */
const I = {
  arrow: '<svg viewBox="0 0 24 24" class="i"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  mic: '<svg viewBox="0 0 24 24" class="i"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" class="i"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  timer: '<svg viewBox="0 0 24 24" class="i"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" class="i"><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19c3-4 6-6 9-8"/></svg>',
  phone: '<svg viewBox="0 0 24 24" class="i"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  msg: '<svg viewBox="0 0 24 24" class="i"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" class="i"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" class="i"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  print: '<svg viewBox="0 0 24 24" class="i"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/></svg>',
  flask: '<svg viewBox="0 0 24 24" class="i"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></svg>',
  doc: '<svg viewBox="0 0 24 24" class="i"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  info: '<svg viewBox="0 0 24 24" class="i"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" class="i"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  move: '<svg viewBox="0 0 24 24" class="i"><path d="M7 7l-4 5 4 5M17 7l4 5-4 5M3 12h18"/></svg>',
};

/* ================================================================ Utilitaires */
let toastTimer = null;
function toast(msg, ms = 3400) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copié.");
  } catch {
    toast("Copie impossible sur ce navigateur.");
  }
}

function route() {
  return location.hash.replace(/^#\/?/, "").split(/[?/]/)[0];
}

function showSorting(on, text) {
  const el = $("#sorting");
  el.hidden = !on;
  if (text) $("#sorting-text").textContent = text;
}

function findItem(id) {
  return state.current?.items.find((it) => it.id === id);
}

function shownIrony(item) {
  if (state.mode !== "direct" || item.zone !== "scenario" || !ironyAllowed(item.texte)) return null;
  return item.ironie || item.ironieLocale || null;
}

/* ================================================================ Consentement */
function requireConsent(cb) {
  if (state.consent !== null) return cb();
  openModal(`
    <div class="modal-card">
      <p class="eyebrow">Avant de garder quoi que ce soit</p>
      <h2>Ton journal reste sur ce téléphone.</h2>
      <ul class="plain">
        <li>Pas de compte, pas de serveur de stockage : BRAVER garde ton journal sur l'appareil.</li>
        <li>Au moment du tri, le texte de tes inquiétudes est envoyé à l'IA. BRAVER ne le conserve nulle part ailleurs.</li>
        <li>Tu peux tout effacer d'un bouton, à tout moment.</li>
      </ul>
      <div class="row">
        <button class="btn primary" data-action="consent" data-v="yes">D'accord, garder sur ce téléphone</button>
        <button class="btn ghost" data-action="consent" data-v="no">Seulement pour cette session</button>
      </div>
      <p class="fine">Une version publique devra respecter la loi marocaine 09-08 sur les données personnelles.</p>
    </div>`);
  pendingConsent = cb;
}
let pendingConsent = null;

/* ================================================================ Modale */
function openModal(html) {
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  root.classList.add("open");
  setTimeout(() => root.querySelector("button, a, input")?.focus(), 30);
}
function closeModal() {
  const root = $("#modal-root");
  root.classList.remove("open");
  root.innerHTML = "";
  clearInterval(breathTimer);
}

/* ================================================================ Vues */

function viewHome() {
  const due = state.replays.filter((r) => r.status === "en_attente" && r.quand <= new Date().toISOString().slice(0, 10));
  const reminder = due.length
    ? `<a class="reminder" href="#/replay"><span class="pill z-scenario">Replay</span><span>Tu avais prédit : « ${esc(due[0].prediction)} » <b>(sûr à ${due[0].certitude} %)</b>. Alors, ça s'est passé comment ?</span>${I.arrow}</a>`
    : "";
  return `
  <section class="hero">
    <p class="eyebrow">Vide ta tête</p>
    <h1>Qu'est-ce qui te pèse <em>ce soir</em>&nbsp;?</h1>
    <p class="lead">Une inquiétude par ligne, en français, en darija ou en arabe. BRAVER ne te fait pas la conversation : il t'aide à trier.</p>
  </section>
  ${reminder}
  <section class="composer">
    <label for="worries" class="sr-only">Tes inquiétudes, une par ligne</label>
    <textarea id="worries" dir="auto" rows="6" spellcheck="false" placeholder="Je vais rater mon entretien demain…&#10;Mazal ma siftsh dossier dyal la bourse…&#10;ما بقيتش قادر نقرا…">${esc(state.draft)}</textarea>
    <p class="interim" id="interim" aria-live="polite"></p>
    <div class="composer-tools">
      <div class="voice">
        <button type="button" class="btn ghost ${ui.listening ? "rec" : ""}" data-action="voice" ${voiceSupported ? "" : 'disabled title="Dictée non disponible sur ce navigateur"'}>${I.mic}<span>${ui.listening ? "Arrêter" : "Dicter"}</span></button>
        <select id="voice-lang" aria-label="Langue de la dictée">
          <option value="fr-FR">Français</option>
          <option value="ar-MA">Darija · الدارجة</option>
        </select>
      </div>
      <div class="tools-right">
        <button type="button" class="btn ghost" data-action="example">Charger l'exemple</button>
        <button type="button" class="btn ghost" data-action="clear">Effacer</button>
      </div>
    </div>
    <button type="button" class="btn primary big" data-action="sort">Trier mes inquiétudes ${I.arrow}</button>
    <p class="fine">Ni un diagnostic, ni une thérapie : un outil de prévention, inspiré de la TCC et de l'ACT.</p>
  </section>
  <section class="zones-explainer" aria-label="Les trois zones">
    ${ZKEYS.map(
      (z) => `<div class="zx z-${z}"><span class="zdot"></span><h3>${ZONES[z].name}</h3><p>${ZONES[z].tagline}</p><small>${ZONES[z].offer}</small></div>`
    ).join("")}
  </section>`;
}

function sourceBadge(cur) {
  if (cur.source === "ia") return `<span class="src ia">${I.sparkle} Trié par l'IA · ${esc(cur.model || "")} · ${(cur.ms / 1000).toFixed(1)} s</span>`;
  const why = cur.fallback ? ` · l'IA n'a pas répondu (${esc(cur.fallback)})` : "";
  return `<span class="src local">Règles locales, hors ligne${why}</span>`;
}

function cardHTML(item, i) {
  const z = item.zone;
  const other = ZKEYS.filter((k) => k !== z);
  const rep =
    item.repetition > 0
      ? `<p class="rep">${state.mode === "direct" ? "On revient à la même question. Tu cherches une info ou une certitude ?" : `Cette inquiétude revient${item.repetition > 1 ? ` (${item.repetition + 1}e fois)` : ""}. On peut la regarder autrement.`}</p>`
      : "";
  let body = "";
  if (z === "scenario") {
    const irony = shownIrony(item);
    const cert = ui.cert[item.id] ?? 70;
    body = `
      <div class="blk"><span class="lbl">Ta prédiction</span><p>${esc(item.prediction)}</p></div>
      ${irony ? `<p class="irony">${esc(irony)}</p>` : ""}
      <div class="blk q"><span class="lbl">Pour vérifier</span><p>${esc(item.question)}</p></div>
      ${
        item.saved
          ? `<p class="done-line">${I.check} Notée dans Mon Replay · sûr à ${item.certitude} %. Reviens après pour comparer.</p>`
          : `<div class="form">
              <label class="slider"><span>Je suis sûr à <output data-out="cert-${item.id}">${cert}</output> % que ça va arriver</span>
                <input type="range" min="10" max="100" step="10" value="${cert}" data-input="cert" data-id="${item.id}" /></label>
              <label class="when">Quand ? <input type="date" value="${ui.when[item.id] ?? tomorrowISO()}" data-input="when" data-id="${item.id}" /></label>
              <button type="button" class="btn zbtn" data-action="to-replay" data-id="${item.id}">Noter ma prédiction</button>
            </div>`
      }`;
  } else if (z === "action") {
    const fear = ui.fear[item.id] ?? 5;
    const t = ui.timers[item.id];
    body = `
      <div class="blk"><span class="lbl">${state.mode === "direct" ? "Défi · 10 minutes" : "Une petite étape"}</span><p>${esc(item.petite_etape)}</p></div>
      ${
        item.done != null
          ? `<p class="done-line">${I.check} Fait avec une peur à ${item.done}/10. C'est ça, être braver.</p>`
          : `<div class="form">
              <label class="slider"><span>Ma peur maintenant : <output data-out="fear-${item.id}">${fear}</output>/10</span>
                <input type="range" min="0" max="10" step="1" value="${fear}" data-input="fear" data-id="${item.id}" /></label>
              <div class="row">
                <button type="button" class="btn ghost" data-action="timer" data-id="${item.id}">${I.timer}<span data-timer="${item.id}">${t ? "…" : "Lancer 10 min"}</span></button>
                <button type="button" class="btn zbtn" data-action="done-action" data-id="${item.id}">${I.check} C'est fait</button>
              </div>
            </div>`
      }`;
  } else {
    body = `
      <div class="blk"><p class="validation">${esc(item.validation)}</p></div>
      <div class="blk"><span class="lbl">Ce qui reste sous ton contrôle</span><p>${esc(item.controle)}</p></div>
      ${
        item.exerciseDone
          ? `<p class="done-line">${I.check} Exercice fait. Une chose sous ton contrôle, pour aujourd'hui.</p>`
          : `<button type="button" class="btn zbtn" data-action="exercise" data-id="${item.id}">${I.leaf} Exercice en 3 temps · 1 min</button>`
      }`;
  }
  return `
  <article class="card z-${z}" draggable="true" data-card="${item.id}" style="--i:${i}">
    <p class="worry" dir="auto">${esc(item.texte)}</p>
    <p class="why">${esc(item.pourquoi)}${item.moved ? " <em>Rangée par toi.</em>" : ""}</p>
    ${rep}
    ${body}
    <div class="move">${I.move}<span>Pas la bonne zone ?</span>${other
      .map((k) => `<button type="button" class="chip z-${k}" data-action="move" data-id="${item.id}" data-zone="${k}">${ZONES[k].name}</button>`)
      .join("")}</div>
  </article>`;
}

function viewTri() {
  const cur = state.current;
  if (!cur) {
    return `<section class="empty"><h1>Pas encore de tri.</h1><p>Écris ce qui te pèse, BRAVER le range en trois zones.</p><a class="btn primary" href="#/">Vide ta tête ${I.arrow}</a></section>`;
  }
  const n = cur.items.length;
  let idx = 0;
  const cols = ZKEYS.map((z) => {
    const items = cur.items.filter((it) => it.zone === z);
    return `<section class="col z-${z}" data-drop="${z}" aria-label="Zone ${ZONES[z].name}">
      <header><span class="zdot"></span><h2>${ZONES[z].name}</h2><span class="count">${items.length}</span><p>${ZONES[z].tagline}</p></header>
      <div class="cards">${items.length ? items.map((it) => cardHTML(it, idx++)).join("") : `<p class="col-empty">Rien ici.</p>`}</div>
    </section>`;
  }).join("");
  return `
  <section class="tri-head">
    <div>
      <p class="eyebrow">Le tri</p>
      <h1>${n} inquiétude${n > 1 ? "s" : ""}, trois zones.</h1>
      <p class="lead">Le tri est une proposition : c'est toi qui gardes le dernier mot. ${state.mode === "direct" ? "Mode direct : un peu d'ironie, seulement sur les scénarios." : ""}</p>
    </div>
    ${sourceBadge(cur)}
  </section>
  ${cur.vigilance ? `<div class="banner">Une de tes phrases peut vouloir dire beaucoup. Si c'est plus que du stress, <a href="#/aide" data-action="help">parle à quelqu'un maintenant</a>.</div>` : ""}
  <div class="board ${ui.fresh ? "fresh" : ""}">${cols}</div>
  <div class="tri-foot"><button type="button" class="btn ghost" data-action="new-sort">Nouveau tri</button><a class="btn ghost" href="#/replay">Mon Replay ${I.arrow}</a></div>`;
}

function verdictLabel(p) {
  if (p === "oui") return "Le pire est arrivé, et tu y as fait face.";
  if (p === "en_partie") return "En partie.";
  return "Le pire n'est pas arrivé.";
}

function viewReplay() {
  const reps = state.replays;
  const pending = reps.filter((r) => r.status === "en_attente");
  const { done, points, top } = calibration(reps);
  const worst = done.filter((r) => r.pire === "oui").length;
  const headline = top
    ? `Quand tu étais sûr à <b>${top.certitude} %</b>, le pire est arrivé <b>${top.oui} fois sur ${top.n}</b>.`
    : "";
  const pendingHTML = pending.length
    ? pending
        .map((r) => {
          const open = ui.openReplay === r.id;
          return `<article class="ri">
          <div class="ri-head"><span class="pill z-scenario">Prévu le ${fmtDate(r.quand)}</span><span class="cert">sûr à ${r.certitude} %</span></div>
          <p class="ri-pred" dir="auto">« ${esc(r.prediction)} »</p>
          <p class="ri-q">${esc(r.question || "")}</p>
          ${
            open
              ? `<div class="form">
                  <label>Ce qui s'est vraiment passé<textarea rows="3" dir="auto" id="reel-${r.id}" placeholder="J'ai hésité sur une question, puis j'ai terminé…"></textarea></label>
                  <fieldset class="seg"><legend>Le pire est-il arrivé ?</legend>
                    <label><input type="radio" name="pire-${r.id}" value="non" checked /> Non</label>
                    <label><input type="radio" name="pire-${r.id}" value="en_partie" /> En partie</label>
                    <label><input type="radio" name="pire-${r.id}" value="oui" /> Oui</label>
                  </fieldset>
                  <button type="button" class="btn primary" data-action="compare" data-id="${r.id}">Comparer avec ma prédiction</button>
                </div>`
              : `<button type="button" class="btn zbtn-s" data-action="open-replay" data-id="${r.id}">Raconter ce qui s'est passé</button>`
          }
        </article>`;
        })
        .join("")
    : `<p class="muted">Aucune prédiction en attente. Dans le tri, une carte <b>Scénario</b> peut être notée ici.</p>`;
  const doneHTML = done.length
    ? done
        .slice()
        .sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""))
        .map(
          (r) => `<article class="ri done">
        <div class="vs">
          <div><span class="lbl">Avant · sûr à ${r.certitude} %</span><p dir="auto">${esc(r.prediction)}</p></div>
          <div><span class="lbl">Vraiment</span><p dir="auto">${esc(r.reel)}</p></div>
        </div>
        <p class="verdict v-${r.pire}">${verdictLabel(r.pire)}</p>
        <p class="comment">${esc(r.commentaire)} <small>${r.source === "ia" ? "IA" : "règles locales"}${r.demo ? " · exemple" : ""}</small></p>
      </article>`
        )
        .join("")
    : `<p class="muted">Rien de comparé pour l'instant.</p>`;
  const actsHTML = state.actions.length
    ? `<ul class="wins">${state.actions
        .slice()
        .reverse()
        .map((a) => `<li><span class="fear">peur ${a.peur}/10</span><span dir="auto">${esc(a.etape)}</span><small>${fmtDate(a.doneAt)}${a.demo ? " · exemple" : ""}</small></li>`)
        .join("")}</ul>`
    : `<p class="muted">Pas encore de petite étape faite. Dans le tri, une carte <b>Action</b> se coche avec « C'est fait ».</p>`;
  return `
  <section class="hero small">
    <p class="eyebrow">Mon Replay</p>
    <h1>Tes peurs, comparées à ta réalité.</h1>
    <p class="lead">Ce n'est pas l'IA qui te rassure : ce sont tes propres faits.</p>
  </section>
  ${state.demo ? `<div class="banner">Exemple de Yassine affiché (données fictives). <button type="button" class="link" data-action="remove-demo">Retirer l'exemple</button></div>` : ""}
  <div class="stats">
    <div class="stat z-scenario"><b>${done.length + pending.length}</b><span>prédictions notées</span></div>
    <div class="stat z-acceptation"><b>${worst}</b><span>fois où le pire est arrivé</span></div>
    <div class="stat z-action"><b>${state.actions.length}</b><span>petites étapes faites avec la peur</span></div>
  </div>
  <section class="panel calib-panel">
    <div class="panel-head"><h2>Score de calibration</h2><span class="muted">Tes certitudes, face à ce qui s'est vraiment passé</span></div>
    ${
      done.length
        ? `<p class="headline">${headline}</p>
           ${calibrationSVG(points)}
           <p class="legend"><span class="lg-dot"></span> ce qui s'est vraiment passé <span class="lg-ideal"></span> si tes peurs disaient vrai</p>
           <p class="fine">Quand la courbe passe sous la ligne pointillée, tes peurs prédisent plus de catastrophes qu'il n'en arrive.</p>`
        : `<p class="muted">Il faut au moins un Replay comparé pour voir ton score.</p><button type="button" class="btn ghost" data-action="load-demo">Voir avec l'exemple de Yassine</button>`
    }
  </section>
  <section class="panel"><div class="panel-head"><h2>À vérifier</h2><span class="count">${pending.length}</span></div>${pendingHTML}</section>
  <section class="panel"><div class="panel-head"><h2>Comparés</h2><span class="count">${done.length}</span></div>${doneHTML}</section>
  <section class="panel"><div class="panel-head"><h2>Petites étapes faites</h2><span class="count">${state.actions.length}</span></div>${actsHTML}</section>
  <section class="panel data">
    <h2>Tes données</h2>
    <p class="muted">${state.consent === true ? "Tout reste sur ce téléphone." : "Tout reste dans ce navigateur, pour cette session seulement."} Rien n'est stocké sur un serveur.</p>
    <button type="button" class="btn danger" data-action="wipe">${I.trash} Tout effacer</button>
  </section>`;
}

function viewAide() {
  const enc = encodeURIComponent(TRUSTED_MESSAGE);
  return `
  <section class="safety">
    <div class="safety-card">
      <p class="eyebrow">BRAVER s'arrête ici</p>
      <h1>Ce que tu ressens compte.<br/>Tu n'as pas à traverser ça sans aide.</h1>
      <div class="trusted">
        <h2>${I.msg} Écrire à une personne de confiance</h2>
        <blockquote>« ${esc(TRUSTED_MESSAGE)} »</blockquote>
        <div class="row">
          <a class="btn primary" href="sms:?&body=${enc}">SMS</a>
          <a class="btn" href="https://wa.me/?text=${enc}" target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" class="btn ghost" data-action="copy-msg">${I.copy} Copier</button>
        </div>
      </div>
      <h2 class="call-title">${I.phone} Appeler maintenant</h2>
      <ul class="lines">
        ${HELPLINES.map(
          (h) => `<li>
            <div><b>${esc(h.name)}</b><span>${esc(h.who)}</span>${h.extra ? `<small>${h.extra.includes("0800") || h.extra.includes("112") || h.extra.includes("150") ? `<a href="tel:${h.tel2}">${esc(h.extra)}</a>` : esc(h.extra)}</small>` : ""}</div>
            ${h.tel ? `<a class="call" href="tel:${h.tel}" aria-label="Appeler ${esc(h.name)}">${h.tel}</a>` : ""}
          </li>`
        ).join("")}
      </ul>
      <p class="src-note">Numéros relevés en août 2026 (TherapyRoute, d'après l'ANRT, le ministère de la Santé, l'ONDE et l'UNFM).</p>
      ${
        ui.alert
          ? `<button type="button" class="btn ghost wide" data-action="misunderstood">On s'est mal compris, je ne suis pas en danger</button>
             <p class="src-note">${ui.alert.doute ? "Arrêt par prudence : cette expression peut être une façon de parler, ou pas. Si c'en était une, dis-le avec le bouton ci-dessus." : `Arrêt déclenché par ${ui.alert.source === "IA" ? "la vérification de l'IA" : "le filtre local, avant tout appel à l'IA"}.`}</p>`
          : `<a class="btn ghost wide" href="#/">Revenir</a>`
      }
    </div>
  </section>`;
}

function viewPlus() {
  return `
  <section class="hero small"><p class="eyebrow">Plus</p><h1>Autour de BRAVER</h1></section>
  <div class="menu">
    <a class="menu-item" href="#/resume">${I.doc}<div><b>Résumé pour un professionnel</b><span>Une page à montrer à un psychologue ou un médecin, avec ton accord.</span></div></a>
    <a class="menu-item" href="#/labo">${I.flask}<div><b>Labo : tester le moteur</b><span>Mesurer le tri et la sécurité sur des phrases de test. Pour le jury.</span></div></a>
    <a class="menu-item" href="#/apropos">${I.info}<div><b>Ce qu'est BRAVER, et ce qu'il n'est pas</b><span>Principes, confidentialité, limites.</span></div></a>
    <button type="button" class="menu-item" data-action="load-demo">${I.sparkle}<div><b>Charger l'exemple de Yassine</b><span>Un mois de Replay fictif, pour voir le score de calibration.</span></div></button>
    <button type="button" class="menu-item danger" data-action="wipe">${I.trash}<div><b>Tout effacer</b><span>Supprime le journal de cet appareil.</span></div></button>
  </div>`;
}

const THEME_LABEL = {
  examen: "les études et les examens", entretien: "les études et les examens", expose: "les études et les examens", reviser: "les études et les examens", prof: "les études et les examens",
  dossier: "les démarches (stage, bourse, dossiers)",
  regard: "le regard des autres",
  famille: "la famille et les proches", emploi: "la famille et les proches", deuil: "la famille et les proches", maladie: "la famille et les proches",
  argent: "l'argent",
};

function summaryData() {
  const hist = state.history;
  const reps = state.replays.filter((r) => r.status === "fait");
  const acts = state.actions;
  if (!hist.length && !reps.length && !acts.length) return null;
  const dates = [...hist.map((h) => h.date), ...state.replays.map((r) => r.createdAt), ...acts.map((a) => a.doneAt)].filter(Boolean).sort();
  const days = Math.max(1, Math.round((Date.now() - new Date(dates[0]).getTime()) / 86400000));
  const weeks = Math.max(1, Math.round(days / 7));
  const zc = { scenario: 0, action: 0, acceptation: 0 };
  hist.forEach((h) => (zc[h.zone] = (zc[h.zone] || 0) + 1));
  const themeCount = {};
  for (const h of hist) {
    const seen = new Set();
    for (const t of topicsOf(h.texte)) if (THEME_LABEL[t] && !seen.has(THEME_LABEL[t])) { seen.add(THEME_LABEL[t]); themeCount[THEME_LABEL[t]] = (themeCount[THEME_LABEL[t]] || 0) + 1; }
  }
  const topTheme = Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0];
  const worst = reps.filter((r) => r.pire === "oui").length;
  const partial = reps.filter((r) => r.pire === "en_partie").length;
  const avgFear = acts.length ? (acts.reduce((s, a) => s + Number(a.peur || 0), 0) / acts.length).toFixed(1).replace(".", ",") : null;
  const accept = [...new Set(hist.filter((h) => h.zone === "acceptation").map((h) => h.texte))].slice(-2);
  let recurring = null;
  for (const h of hist) {
    const n = hist.filter((o) => o !== h && similarity(o.texte, h.texte) >= 0.5).length;
    if (n >= 1 && (!recurring || n > recurring.n)) recurring = { texte: h.texte, n: n + 1 };
  }
  const puces = [];
  if (hist.length) puces.push(`J'ai noté ${hist.length} inquiétudes : ${zc.scenario} prédictions, ${zc.action} choses à faire, ${zc.acceptation} réalités qui m'échappent.`);
  if (topTheme) puces.push(`Ce qui revient le plus : ${topTheme[0]} (${topTheme[1]} inquiétudes sur ${hist.length}).`);
  if (reps.length) puces.push(`J'ai noté ${reps.length} prédictions, puis vérifié ce qui s'est passé. Le pire est arrivé ${worst} fois${partial ? `, en partie ${partial} fois` : ""}.`);
  if (acts.length) puces.push(`J'ai fait ${acts.length} petites étapes, avec une peur moyenne de ${avgFear}/10 au moment de les faire.`);
  if (accept.length) puces.push(`Ce qui m'échappe : ${accept.map((t) => `« ${t} »`).join(", ")}.`);
  if (recurring) puces.push(`Une inquiétude revient souvent (${recurring.n} fois) : « ${recurring.texte} ».`);
  return { titre: `Ce qui me pèse depuis ${weeks} semaine${weeks > 1 ? "s" : ""}`, periode: `${weeks} semaine${weeks > 1 ? "s" : ""}`, puces };
}

function viewResume() {
  const data = summaryData();
  if (!data) {
    return `<section class="hero small"><p class="eyebrow">Résumé pour un professionnel</p><h1>Pas encore assez de données.</h1><p class="lead">Fais quelques tris et quelques Replays, ou charge l'exemple de Yassine.</p></section>
      <button type="button" class="btn primary" data-action="load-demo">Charger l'exemple de Yassine</button>`;
  }
  const shown = ui.summaryAI || data;
  return `
  <section class="hero small no-print">
    <p class="eyebrow">Résumé pour un professionnel</p>
    <h1>Une page, pour en parler à quelqu'un.</h1>
    <p class="lead">À montrer à un psychologue, un médecin ou une cellule d'écoute. Calculé sur ton téléphone, à partir de ton journal.</p>
  </section>
  ${
    !ui.summaryOn
      ? `<section class="panel no-print">
          <label class="check"><input type="checkbox" id="sum-consent" /> Je choisis de créer ce résumé pour le montrer à un professionnel.</label>
          <button type="button" class="btn primary" data-action="make-summary">Créer mon résumé</button>
        </section>`
      : `<article class="sheet">
          <p class="sheet-brand">BRAVER · résumé personnel</p>
          <h2>${esc(shown.titre)}</h2>
          <ul>${shown.puces.map((p) => `<li dir="auto">${esc(p)}</li>`).join("")}</ul>
          <p class="sheet-foot">Écrit avec mon accord · reste sur mon téléphone · ${ui.summaryAI ? "reformulé par l'IA à partir de mes données" : "calculé à partir de mon journal"} · ce n'est pas un diagnostic.</p>
        </article>
        <div class="row no-print">
          <button type="button" class="btn primary" data-action="print">${I.print} Imprimer / PDF</button>
          ${useAI() ? `<button type="button" class="btn ghost" data-action="ai-summary">${I.sparkle} ${ui.summaryAI ? "Version calculée" : "Faire reformuler par l'IA"}</button>` : ""}
        </div>`
  }`;
}

function viewAbout() {
  return `
  <section class="hero small"><p class="eyebrow">À propos</p><h1>Not fearless. Just braver.</h1>
  <p class="lead">BRAVER aide les jeunes à trier ce qui les inquiète en trois zones, pour savoir s'il faut questionner une pensée, agir ou accepter.</p></section>
  <div class="about">
    <section class="panel"><h2>Ce qui distingue BRAVER</h2><ul class="plain">
      <li><b>Il ne rassure pas automatiquement</b> : il aide à vérifier, à agir ou à accepter.</li>
      <li><b>Il sait quand ne pas confronter</b> : deuil, injustice ou situation grave, pas d'ironie et pas de recadrage.</li>
      <li><b>Le Replay</b> transforme chaque peur affrontée en preuve personnelle.</li>
      <li><b>La sécurité passe avant tout</b> : filtre local puis vérification de l'IA, et orientation vers une aide humaine.</li></ul></section>
    <section class="panel"><h2>Ce que BRAVER n'est pas</h2><p>Ni un diagnostic, ni une thérapie, ni un remplaçant du psychologue. C'est un outil de prévention inspiré de principes de TCC et d'ACT, à évaluer avec des professionnels.</p></section>
    <section class="panel"><h2>Le ton</h2><p>Le mode <b>Doux</b> est le réglage par défaut. Le mode <b>Direct</b> autorise une pointe d'ironie, seulement sur les scénarios, toujours sur le mécanisme de pensée et jamais sur la personne. Jamais d'ironie sur un deuil, une maladie, une violence, le physique, les notes, la famille, la religion ou l'argent.</p></section>
    <section class="panel"><h2>Confidentialité</h2><p>Le journal reste sur l'appareil et s'efface d'un bouton. Seul le texte à trier est envoyé à l'IA, au moment du tri. Une version publique devra respecter la loi marocaine 09-08 sur les données personnelles.</p></section>
    <section class="panel"><h2>Sous le capot</h2><p>Filtre de sécurité par mots-clés (français, darija en lettres latines et arabes), tri par un modèle de langage avec réponse en JSON, règles locales de secours si le réseau tombe. Moteur actuel : <b>${ai.available ? `IA (${esc(ai.model)})` : "règles locales"}</b>.</p></section>
  </div>`;
}

const VIEWS = { "": viewHome, tri: viewTri, replay: viewReplay, aide: viewAide, plus: viewPlus, resume: viewResume, labo: () => laboView({ aiAvailable: ai.available, model: ai.model }), apropos: viewAbout };

/* ================================================================ Rendu */
let lastRoute = null;
function render() {
  const r = route();
  const fn = VIEWS[r] || viewHome;
  document.body.classList.toggle("is-safety", r === "aide");
  document.body.dataset.route = r || "home";
  view.innerHTML = fn();
  updateChrome();
  if (r !== lastRoute) {
    window.scrollTo(0, 0);
    if (r === "aide") view.focus({ preventScroll: true });
  }
  lastRoute = r;
  if (ui.fresh) setTimeout(() => (ui.fresh = false), 50);
  if (r === "") {
    const sel = $("#voice-lang");
    if (sel) sel.value = ui.voiceLang || "fr-FR";
  }
  restoreTimers();
}

function updateChrome() {
  const r = route();
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === r || (a.dataset.nav === "plus" && ["resume", "labo", "apropos"].includes(r))));
  document.querySelectorAll('[data-action="mode"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
  const dot = $("#engine-dot");
  const txt = $("#engine-text");
  const force = $("#force-local");
  force.checked = state.forceLocal;
  force.disabled = !ai.available;
  if (!ai.checked) {
    txt.textContent = "Vérification du moteur…";
    dot.className = "engine-dot";
  } else if (useAI()) {
    txt.textContent = `Moteur : IA · ${ai.model}`;
    dot.className = "engine-dot on";
  } else {
    txt.textContent = ai.available ? "Moteur : règles locales (choisi)" : "Moteur : règles locales, hors ligne";
    dot.className = "engine-dot off";
  }
}

/* ================================================================ Tri */
async function doSort(lines, { override = false } = {}) {
  if (!lines.length) return toast("Écris au moins une inquiétude, une par ligne.");
  if (ui.busy) return;
  ui.busy = true;
  ui.pendingLines = lines;
  stopDictation();
  showSorting(true, useAI() ? "L'IA trie tes inquiétudes…" : "BRAVER trie tes inquiétudes…");
  const minDelay = new Promise((r) => setTimeout(r, 700));
  let res;
  try {
    res = await sortWorries(lines, { mode: state.mode, useAI: useAI(), override, history: state.history });
  } finally {
    await minDelay;
    showSorting(false);
    ui.busy = false;
  }
  if (res.alert) {
    ui.alert = res.alert;
    location.hash = "#/aide";
    if (route() === "aide") render();
    return;
  }
  ui.alert = null;
  const now = new Date().toISOString();
  state.current = {
    id: uid(),
    createdAt: now,
    source: res.source,
    model: res.model,
    ms: res.ms,
    fallback: res.fallback,
    vigilance: Boolean(res.vigilance),
    items: res.items.map((it) => ({ ...it, id: uid() })),
  };
  for (const it of state.current.items) state.history.push({ id: it.id, texte: it.texte, zone: it.zone, date: now });
  state.history = state.history.slice(-300);
  save();
  ui.fresh = true;
  if (route() === "tri") render();
  else location.hash = "#/tri";
}

function moveCard(id, zone) {
  const it = findItem(id);
  if (!it || it.zone === zone) return;
  const fresh = sanitize(fillLocal(it.texte, zone, it.repetition > 0), it.texte, it.repetition > 0);
  Object.assign(it, fresh, { zone, moved: true, saved: false, done: null, exerciseDone: false, pourquoi: "Tu l'as rangée ici : c'est toi qui décides." });
  const h = state.history.find((x) => x.id === id);
  if (h) h.zone = zone;
  save();
  render();
  toast(`Carte déplacée vers ${ZONES[zone].name}.`);
}

/* ================================================================ Minuteur 10 min */
const timerLoops = {};
function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function restoreTimers() {
  for (const [id, end] of Object.entries(ui.timers)) {
    const el = document.querySelector(`[data-timer="${id}"]`);
    if (el) el.textContent = fmtClock(end - Date.now());
  }
}
function startTimer(id) {
  if (ui.timers[id]) {
    delete ui.timers[id];
    clearInterval(timerLoops[id]);
    const el = document.querySelector(`[data-timer="${id}"]`);
    if (el) el.textContent = "Lancer 10 min";
    return;
  }
  ui.timers[id] = Date.now() + 10 * 60 * 1000;
  timerLoops[id] = setInterval(() => {
    const left = ui.timers[id] - Date.now();
    const el = document.querySelector(`[data-timer="${id}"]`);
    if (el) el.textContent = fmtClock(left);
    if (left <= 0) {
      clearInterval(timerLoops[id]);
      delete ui.timers[id];
      toast("10 minutes. Tu l'as fait, même avec la peur ? Coche « C'est fait ».", 6000);
      if (el) el.textContent = "Lancer 10 min";
    }
  }, 1000);
  restoreTimers();
  toast("Minuteur lancé : 10 minutes, juste cette étape.");
}

/* ================================================================ Exercice 3 temps */
const EMOTIONS = ["Tristesse", "Peur", "Colère", "Impuissance", "Fatigue", "Honte", "Autre chose"];
let breathTimer = null;
function exerciseHTML() {
  const ex = ui.exercise;
  const it = findItem(ex.id);
  const steps = `<ol class="steps">${["Reconnaître", "Respirer", "Revenir"].map((s, i) => `<li class="${i + 1 === ex.step ? "on" : i + 1 < ex.step ? "ok" : ""}">${s}</li>`).join("")}</ol>`;
  if (ex.step === 1) {
    return `<div class="modal-card z-acceptation">${steps}<h2>Qu'est-ce que tu ressens, là ?</h2><p class="muted">Pas besoin de le changer. Juste le nommer.</p>
      <div class="chips">${EMOTIONS.map((e) => `<button type="button" class="chip ${ex.emotion === e ? "sel" : ""}" data-action="ex-emotion" data-v="${e}">${e}</button>`).join("")}</div>
      <div class="row"><button type="button" class="btn primary" data-action="ex-next" ${ex.emotion ? "" : "disabled"}>Continuer</button><button type="button" class="btn ghost" data-action="close-modal">Fermer</button></div></div>`;
  }
  if (ex.step === 2) {
    return `<div class="modal-card z-acceptation">${steps}<h2>Trois respirations.</h2><p class="muted">Inspire 4 secondes, expire 6 secondes. Ce que tu ressens (${esc(ex.emotion.toLowerCase())}) peut rester là.</p>
      <div class="breath"><div class="breath-circle"></div><p id="breath-text">Inspire…</p></div>
      <div class="row"><button type="button" class="btn primary" data-action="ex-next">Continuer</button></div></div>`;
  }
  return `<div class="modal-card z-acceptation">${steps}<h2>Ce qui reste sous ton contrôle</h2>
    <p class="big-quote">${esc(it?.controle || "")}</p>
    <p class="muted">Ça ne change pas ce qui t'échappe. C'est une chose que tu peux faire, toi, aujourd'hui.</p>
    <div class="row"><button type="button" class="btn primary" data-action="ex-finish">Je le garde pour aujourd'hui</button><button type="button" class="btn ghost" data-action="close-modal">Fermer</button></div></div>`;
}
function renderExercise() {
  openModal(exerciseHTML());
  clearInterval(breathTimer);
  if (ui.exercise?.step === 2) {
    let phase = 0;
    const tick = () => {
      const el = $("#breath-text");
      if (!el) return clearInterval(breathTimer);
      el.textContent = phase % 2 === 0 ? "Inspire…" : "Expire…";
      phase++;
    };
    tick();
    let wait = 4000;
    const loop = () => {
      breathTimer = setTimeout(() => {
        tick();
        wait = wait === 4000 ? 6000 : 4000;
        loop();
      }, wait);
    };
    loop();
  }
}

/* ================================================================ Exemple de démo */
function loadDemo() {
  state.replays = state.replays.filter((r) => !r.demo);
  state.actions = state.actions.filter((a) => !a.demo);
  state.history = state.history.filter((h) => !h.demo);
  DEMO_REPLAYS.forEach((d) =>
    state.replays.push({ id: uid(), texte: d.texte, prediction: d.prediction, question: "", certitude: d.certitude, quand: daysAgo(d.jours).slice(0, 10), createdAt: daysAgo(d.jours + 1), status: "fait", reel: d.reel, pire: d.pire, commentaire: d.commentaire, source: "ia", doneAt: daysAgo(d.jours), demo: true })
  );
  DEMO_ACTIONS.forEach((a) => state.actions.push({ id: uid(), texte: a.texte, etape: a.etape, peur: a.peur, doneAt: daysAgo(a.jours), demo: true }));
  DEMO_HISTORY.forEach((t, i) => {
    const zone = /khrjouh/i.test(t) ? "acceptation" : /mazal|réviser|parler/i.test(t) ? "action" : "scenario";
    state.history.unshift({ id: uid(), texte: t, zone, date: daysAgo(28 - i * 3), demo: true });
  });
  state.demo = true;
  save();
}
function removeDemo() {
  state.replays = state.replays.filter((r) => !r.demo);
  state.actions = state.actions.filter((a) => !a.demo);
  state.history = state.history.filter((h) => !h.demo);
  state.demo = false;
  save();
}

/* ================================================================ Actions */
const actions = {
  mode(el) {
    state.mode = el.dataset.mode;
    save();
    render();
    if (route() === "tri" && state.current) toast(state.mode === "direct" ? "Mode direct : un peu d'ironie, seulement sur les scénarios." : "Mode doux.");
  },
  help() {
    ui.alert = null;
  },
  example() {
    state.draft = EXAMPLE.join("\n");
    save();
    const ta = $("#worries");
    if (ta) ta.value = state.draft;
  },
  clear() {
    state.draft = "";
    save();
    const ta = $("#worries");
    if (ta) {
      ta.value = "";
      ta.focus();
    }
  },
  sort() {
    const text = $("#worries")?.value ?? state.draft;
    state.draft = text;
    save();
    doSort(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  },
  "new-sort"() {
    location.hash = "#/";
  },
  voice() {
    if (ui.listening) {
      stopDictation();
      return;
    }
    const lang = $("#voice-lang")?.value || "fr-FR";
    ui.voiceLang = lang;
    ui.listening = true;
    render();
    startDictation({
      lang,
      onFinal: (t) => {
        const ta = $("#worries");
        if (!ta || !t) return;
        ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/, "\n") : "") + t;
        state.draft = ta.value;
        save();
      },
      onInterim: (t) => {
        const el = $("#interim");
        if (el) el.textContent = t;
      },
      onEnd: () => {
        ui.listening = false;
        if (route() === "") render();
      },
      onError: (e) => {
        ui.listening = false;
        toast(e === "not-allowed" ? "Micro refusé. Autorise le micro pour dicter." : "Dictée indisponible ici. Écris plutôt une ligne par souci.");
        if (route() === "") render();
      },
    });
  },
  move(el) {
    moveCard(el.dataset.id, el.dataset.zone);
  },
  "to-replay"(el) {
    const it = findItem(el.dataset.id);
    if (!it) return;
    requireConsent(() => {
      const certitude = Number(ui.cert[it.id] ?? 70);
      state.replays.push({ id: uid(), cardId: it.id, texte: it.texte, prediction: it.texte, reformulation: it.prediction, question: it.question, certitude, quand: ui.when[it.id] ?? tomorrowISO(), createdAt: new Date().toISOString(), status: "en_attente" });
      it.saved = true;
      it.certitude = certitude;
      save();
      render();
      toast("Prédiction notée. Reviens après, pour comparer avec ce qui s'est vraiment passé.");
    });
  },
  "done-action"(el) {
    const it = findItem(el.dataset.id);
    if (!it) return;
    requireConsent(() => {
      const peur = Number(ui.fear[it.id] ?? 5);
      state.actions.push({ id: uid(), texte: it.texte, etape: it.petite_etape, peur, doneAt: new Date().toISOString() });
      it.done = peur;
      if (ui.timers[it.id]) startTimer(it.id);
      save();
      render();
      toast(`Fait avec une peur à ${peur}/10. On n'attend pas que la peur parte.`);
    });
  },
  timer(el) {
    startTimer(el.dataset.id);
  },
  exercise(el) {
    ui.exercise = { id: el.dataset.id, step: 1, emotion: null };
    renderExercise();
  },
  "ex-emotion"(el) {
    ui.exercise.emotion = el.dataset.v;
    renderExercise();
  },
  "ex-next"() {
    ui.exercise.step++;
    renderExercise();
  },
  "ex-finish"() {
    const ex = ui.exercise;
    const it = findItem(ex.id);
    closeModal();
    requireConsent(() => {
      state.acceptances.push({ id: uid(), texte: it?.texte, emotion: ex.emotion, controle: it?.controle, doneAt: new Date().toISOString() });
      if (it) it.exerciseDone = true;
      ui.exercise = null;
      save();
      render();
      toast("C'est noté. Une chose sous ton contrôle, pour aujourd'hui.");
    });
  },
  "close-modal"() {
    closeModal();
    ui.exercise = null;
  },
  consent(el) {
    state.consent = el.dataset.v === "yes";
    save();
    closeModal();
    const cb = pendingConsent;
    pendingConsent = null;
    cb?.();
  },
  "open-replay"(el) {
    ui.openReplay = el.dataset.id;
    render();
    setTimeout(() => $(`#reel-${el.dataset.id}`)?.focus(), 30);
  },
  async compare(el) {
    const r = state.replays.find((x) => x.id === el.dataset.id);
    if (!r) return;
    const reel = $(`#reel-${r.id}`)?.value.trim();
    if (!reel) return toast("Écris en une phrase ce qui s'est vraiment passé.");
    const pire = document.querySelector(`input[name="pire-${r.id}"]:checked`)?.value || "non";
    el.disabled = true;
    el.textContent = useAI() ? "L'IA compare…" : "Comparaison…";
    const { commentaire, source } = await replayComment({ prediction: r.prediction, reel, certitude: r.certitude, pire }, useAI());
    Object.assign(r, { status: "fait", reel, pire, commentaire, source, doneAt: new Date().toISOString() });
    ui.openReplay = null;
    save();
    render();
    toast("Replay ajouté. Regarde ton score de calibration.");
  },
  "load-demo"() {
    loadDemo();
    if (route() === "plus") location.hash = "#/replay";
    else render();
    toast("Exemple de Yassine chargé (données fictives).");
  },
  "remove-demo"() {
    removeDemo();
    render();
  },
  wipe() {
    openModal(`<div class="modal-card"><h2>Tout effacer ?</h2><p>Ton journal (tris, Replays, petites étapes) sera supprimé de cet appareil. Ce n'est pas réversible.</p>
      <div class="row"><button type="button" class="btn danger" data-action="wipe-yes">${I.trash} Tout effacer</button><button type="button" class="btn ghost" data-action="close-modal">Annuler</button></div></div>`);
  },
  "wipe-yes"() {
    wipe();
    ui.summaryOn = false;
    ui.summaryAI = null;
    closeModal();
    render();
    toast("Tout est effacé de cet appareil.");
  },
  "copy-msg"() {
    copyText(TRUSTED_MESSAGE);
  },
  misunderstood() {
    const lines = ui.pendingLines.slice();
    ui.alert = null;
    if (lines.length) doSort(lines, { override: true });
    else location.hash = "#/";
  },
  "make-summary"() {
    if (!$("#sum-consent")?.checked) return toast("Coche la case : ce résumé ne se crée qu'avec ton accord.");
    ui.summaryOn = true;
    render();
  },
  print() {
    window.print();
  },
  async "ai-summary"(el) {
    if (ui.summaryAI) {
      ui.summaryAI = null;
      return render();
    }
    const data = summaryData();
    el.disabled = true;
    el.textContent = "L'IA reformule…";
    try {
      const d = await aiSummary({ accord: true, periode: data.periode, faits: data.puces });
      if (d.titre && d.puces?.length) ui.summaryAI = { titre: d.titre, puces: d.puces };
    } catch {
      toast("L'IA n'a pas répondu. La version calculée reste valable.");
    }
    render();
  },
  "labo-set"(el) {
    labo.set = el.dataset.v;
    labo.results = null;
    render();
  },
  "labo-engine"(el) {
    labo.engine = el.dataset.v;
    labo.results = null;
    render();
  },
  async "labo-run"() {
    if (labo.running) return;
    const ta = $("#labo-custom");
    if (ta) labo.custom = ta.value;
    labo.noFilter = Boolean($("#labo-nofilter")?.checked);
    await runLabo({ useAI: labo.engine === "ia" && ai.available, onProgress: render });
    render();
  },
  "labo-copy"() {
    copyText(laboSummaryText(ai.model));
  },
};

/* ================================================================ Événements */
function bind() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) {
      if (e.target.classList?.contains("modal") && !ui.exercise) closeModal();
      return;
    }
    const fn = actions[el.dataset.action];
    if (!fn) return;
    if (el.tagName === "A" && el.dataset.action !== "help") e.preventDefault();
    fn(el, e);
  });
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "worries") {
      state.draft = el.value;
      clearTimeout(bind.t);
      bind.t = setTimeout(save, 400);
      return;
    }
    const kind = el.dataset?.input;
    if (!kind) return;
    const id = el.dataset.id;
    ui[kind === "cert" ? "cert" : kind === "fear" ? "fear" : "when"][id] = el.value;
    const out = document.querySelector(`[data-out="${kind}-${id}"]`);
    if (out) out.textContent = el.value;
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "force-local") {
      state.forceLocal = e.target.checked;
      save();
      updateChrome();
      toast(state.forceLocal ? "Plan B : tout le parcours tourne en règles locales, sans réseau." : "Retour au tri par l'IA.");
    }
    if (e.target.id === "voice-lang") ui.voiceLang = e.target.value;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#modal-root").classList.contains("open")) {
      closeModal();
      ui.exercise = null;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.id === "worries") actions.sort();
  });
  // Glisser-déposer des cartes entre zones (ordinateur).
  document.addEventListener("dragstart", (e) => {
    const card = e.target.closest?.("[data-card]");
    if (!card) return;
    e.dataTransfer.setData("text/plain", card.dataset.card);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  });
  document.addEventListener("dragend", (e) => e.target.closest?.("[data-card]")?.classList.remove("dragging"));
  document.addEventListener("dragover", (e) => {
    const col = e.target.closest?.("[data-drop]");
    if (!col) return;
    e.preventDefault();
    document.querySelectorAll(".col.over").forEach((c) => c !== col && c.classList.remove("over"));
    col.classList.add("over");
  });
  document.addEventListener("drop", (e) => {
    const col = e.target.closest?.("[data-drop]");
    document.querySelectorAll(".col.over").forEach((c) => c.classList.remove("over"));
    if (!col) return;
    e.preventDefault();
    moveCard(e.dataTransfer.getData("text/plain"), col.dataset.drop);
  });
  window.addEventListener("hashchange", () => {
    if (route() !== "aide" && ui.alert && route() !== "") ui.alert = null;
    render();
  });
}

/* ================================================================ Démarrage (et captures pour les slides) */
async function setupShot(shot, params) {
  if (params.get("consent") === "1") state.consent = true;
  if (params.get("mode")) state.mode = params.get("mode");
  ai.checked = true;
  if (["tri", "home"].includes(shot)) state.draft = EXAMPLE.join("\n");
  if (shot === "tri") {
    const res = await sortWorries(EXAMPLE, { mode: state.mode, useAI: false });
    state.current = { id: uid(), createdAt: new Date().toISOString(), source: "local", ms: res.ms, items: res.items.map((it) => ({ ...it, id: uid() })) };
    const cardScen = state.current.items.find((i) => i.zone === "scenario");
    if (cardScen) ui.cert[cardScen.id] = 90;
    const cardAct = state.current.items.find((i) => i.zone === "action");
    if (cardAct) ui.fear[cardAct.id] = 6;
    location.hash = "#/tri";
  }
  if (shot === "replay" || shot === "resume") {
    loadDemo();
    if (shot === "resume") ui.summaryOn = true;
    location.hash = `#/${shot}`;
  }
  if (shot === "aide") {
    ui.alert = { source: "filtre local", lignes: ["bghit nmout"], raison: "mot-clé de danger" };
    ui.pendingLines = ["bghit nmout"];
    location.hash = "#/aide";
  }
  if (shot === "labo") {
    labo.set = params.get("set") || "dossier";
    location.hash = "#/labo";
    await runLabo({ useAI: false, onProgress: () => {} });
  }
}

async function init() {
  bind();
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (shot) {
    await setupShot(shot, params);
    render();
    document.body.classList.add("shot");
    return;
  }
  render();
  await checkAI();
  updateChrome();
  if (["", "apropos", "resume", "labo"].includes(route())) render();
}

init();
