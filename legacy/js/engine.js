// Moteur de BRAVER : filtre de sécurité local, appel IA, règles locales de secours, garde-fous.
import { SAFETY_KEYWORDS, SAFETY_PATTERNS, SAFETY_DOUBT } from "./data.js";
import { normalize, hasAny, prep, similarity } from "./text.js";

/* ---------------------------------------------------------------- Sécurité */

const SAFETY = prep(SAFETY_KEYWORDS);
const DOUBT = prep(SAFETY_DOUBT);

// alerte = arrêt immédiat ; doute = à faire trancher par l'IA (ou alerte si pas d'IA).
export function safetyCheck(text) {
  const norm = normalize(text);
  const hit = SAFETY.find((p) => hasAny(norm, [p])) || (SAFETY_PATTERNS.some((r) => r.test(norm)) ? "variante darija" : null);
  if (hit) return { alerte: true, niveau: "fort", raison: "mot-clé de danger", motif: hit.trim() };
  const doubt = DOUBT.find((p) => hasAny(norm, [p]));
  if (doubt) return { alerte: false, doute: true, niveau: "doute", raison: "expression à vérifier", motif: doubt.trim() };
  return { alerte: false };
}

/* ---------------------------------------------------------------- Thèmes */

const T = (list) => prep(list);
const TOPICS = {
  entretien: T(["entretien", "interview", "انترفيو", "recrutement"]),
  examen: T(["examen", "exam", "partiel", "controle", "imti7an", "امتحان", "semestre", "rattrapage", "concours", "bac"]),
  expose: T(["expose", "presentation", "oral", "soutenance", "parler devant"]),
  regard: T(["tout le monde", "juger", "jugent", "moquer", "moque", "rire de moi", "yd7ek", "yd7ko", "يضحك", "kolchi ghadi", "les autres", "ils pensent", "elle pense", "il pense", "regard"]),
  prof: T(["prof", "professeur", "ostad", "استاد", "encadrant"]),
  dossier: T(["dossier", "stage", "bourse", "candidature", " cv ", "mail", "inscription", "papiers", "siftsh", "sift", "nsift", "صيفط", "formulaire"]),
  reviser: T(["reviser", "revision", "etudier", "nqra", "نقرا", "قادر نقرا", "cours", "examen est dans", "bosser", "memoire"]),
  parler: T(["parler", "coloc", "appeler", "dire a", "nhder", "nhdar", "نهضر", "discuter", "conversation"]),
  deuil: T(["decede", "decedee", "deces", "est mort", "est morte", "nous a quitte", "enterrement", " mat ", "توفى", "توفي", " مات ", "ماتت", "يرحمو", "rahmo", "lah yr7mo"]),
  emploi: T(["perdu son travail", "perdu son emploi", "perdu son boulot", "chomage", "licencie", "khrjouh", "khrjoha", "lkhedma", "الخدمة", "خرجوه", "sans travail"]),
  refus: T(["pas ete pris", "pas ete prise", "refuse", "refusee", "rejete", "pas accepte", "pas admis", "ma tqbeltch", "ma tqbltch"]),
  maladie: T(["malade", "maladie", "cancer", "hopital", "hospitalis", "operation", "mrid", "mrida", "مريض", "مريضه", "sbitar", "سبيطار", "الصبيطار", "urgences"]),
  famille: T(["pere", "mere", "parents", "bba", "baba", "mama", "frere", "soeur", "famille", "الواليد", "بابا", "ماما", "خويا", "ختي", "grand mere", "grand pere"]),
  argent: T(["argent", "flous", "فلوس", "loyer", "dettes", "payer", "sans le sou"]),
  physique: T(["poids", "gros ", "grosse", "moche", "corps", "visage", "physique", "kilos"]),
  religion: T(["religion", "dieu", "priere", "allah", "الله", "salat"]),
  notes: T(["note", "notes", "moyenne", "j ai eu", "/20", "eu 9", "eu 8", "eu 7"]),
  honte: T(["honte", "je suis nul", "je suis nulle", "je vaux rien", "je ne vaux rien", "vie est finie", "foutu", "foutue", "bon a rien", "bonne a rien", "7chouma", "حشومة"]),
  repetition: T(["deja demande", "deja dit", "trois fois", "3 fois", "encore la meme", "toujours la meme", "je sais je"]),
};

export function topicsOf(text) {
  const norm = normalize(text);
  const out = new Set();
  for (const [k, pats] of Object.entries(TOPICS)) if (hasAny(norm, pats)) out.add(k);
  return out;
}

/* ---------------------------------------------------------------- Tri local par règles */

const CUES = {
  scenario: [
    [2, T(["vais rater", "va rater", "vais echouer", "vais bloquer", "va mal se passer", "vont me", "va me ", "tout le monde", "se moquer", "me deteste", "j en suis sur", "je suis sur que", "et si", "va penser", "vont penser", "vie est finie", "met2ked", "metaked", "mt2ked", "متاكد", "ghadich", "غاديش", "ما غاديش", "yd7ek", "nfchel", "nsqet", "ghadi nfchel"])],
    [1, T(["deteste", "rater", "echouer", "bloquer", "jamais", "personne ne", "ils pensent", "il pense", "elle pense", "ghadi", "غادي", "ndouz", "3liya", "عليا", "je vais", "ils vont", "elle va", "il va", "honte"])],
  ],
  action: [
    [2, T(["toujours pas", "pas encore", "pas envoye", "pas commence", "repousse", "je repousse", "n arrive pas a commencer", "mazal", "ma siftsh", "كناجل", "kan2ajel", "kanajjel", "kanmatal", "procrastin", "j evite", "pas fait", "pas rendu", "ما بقيتش قادر"])],
    [1, T(["je dois", "il faut que", "faut que", "je dois trouver", "dossier", "envoyer", "reviser", "examen est dans", "rendre", "deadline", "khassni", "khasni", "خاصني", "nqra", "نقرا", "bourse", "inscription", "rendez vous", "appeler", "parler a", "parler du", "commencer", "finir mon", "chercher"])],
  ],
  acceptation: [
    [3, [...TOPICS.deuil, ...TOPICS.emploi]],
    [2, [...TOPICS.refus, ...TOPICS.maladie, ...T(["divorce", "se separent", "separes", "تطلقو", "طلاق", "tl9o", "tle9o", "on n a pas d argent", "pas les moyens", "khrjouh", "peux rien y faire", "peux rien faire", "ma bidi ma ndir", "ما بيدي", "si seulement", "j aurais du", "كون غير", "kon ghir", "ضيعت"])]],
    [1, T(["situation", "crise", "decision", "le passe", "c etait", "c est arrive", "a perdu", "ont decide", "malheureusement", "grave", "regrette"])],
  ],
};

export function classifyLocal(text) {
  const norm = normalize(text);
  const score = { scenario: 0, action: 0, acceptation: 0 };
  for (const [zone, groups] of Object.entries(CUES)) {
    for (const [w, pats] of groups) for (const p of pats) if (hasAny(norm, [p])) score[zone] += w;
  }
  const order = ["acceptation", "action", "scenario"]; // départage
  let best = "scenario";
  let max = 0;
  for (const z of order) if (score[z] > max) { max = score[z]; best = z; }
  return { zone: best, score, sure: max > 0 };
}

const WHY = {
  scenario: (t) =>
    t.has("prof") || t.has("regard")
      ? "C'est une interprétation : tu ne sais pas encore ce que les autres pensent vraiment."
      : "C'est une prédiction : ça n'a pas encore eu lieu.",
  action: () => "C'est réel, et tu as une prise dessus, même petite.",
  acceptation: (t) =>
    t.has("refus") ? "C'est une décision d'autrui : elle t'échappe, même si la suite reste à toi." : "C'est réel, et ça ne dépend pas de toi.",
};

function scenarioFields(t, rep) {
  let prediction = "Ton esprit prédit le pire, avant que ça ait eu lieu.";
  let question = "Sur 10 fois où tu as pensé ça, combien de fois c'est vraiment arrivé ?";
  if (t.has("entretien")) {
    prediction = "Tu prédis que l'entretien va mal se passer.";
    question = "Qu'est-ce qui te prouve, aujourd'hui, que tu vas bloquer ?";
  } else if (t.has("regard") || t.has("expose")) {
    prediction = "Tu prédis que les autres vont se moquer de toi.";
    question = "La dernière fois que quelqu'un a présenté, combien se sont vraiment moqués ?";
  } else if (t.has("prof")) {
    prediction = "Tu interprètes ta note comme la preuve que ton prof te déteste.";
    question = "Quelles autres explications possibles pour cette note ?";
  } else if (t.has("examen")) {
    prediction = "Tu prédis un échec, et que tout s'arrêterait avec.";
    question = "Si ça arrivait vraiment, quelle serait la toute première chose que tu ferais ?";
  } else if (t.has("famille")) {
    prediction = "Tu prédis une réaction très dure de ta famille.";
    question = "La dernière fois, comment ça s'est vraiment passé ?";
  }
  if (rep) question = "On revient à la même question. Tu cherches une info, ou une certitude ?";
  return { prediction, question };
}

function ironyFor(t, rep) {
  if (rep) return "Quinze scénarios ? Ton cerveau a déjà écrit toute la saison. Lequel s'est réellement produit ?";
  if (t.has("entretien") || t.has("examen")) return "Tu as déjà les résultats, ou ton imagination fait des heures sup ?";
  if (t.has("regard") || t.has("expose")) return "Tout le monde va te juger ? Il faudrait déjà que tout le monde soit attentif.";
  return "Ton cerveau a déjà écrit la fin. Il a des preuves, ou juste le sens du suspense ?";
}

function actionFields(t) {
  if (t.has("dossier")) return "Ouvre le mail, joins le dossier tel qu'il est, et envoie-le. Dix minutes, pas plus.";
  if (t.has("reviser") || t.has("examen")) return "Lance un minuteur de 10 minutes et lis seulement le premier titre du cours.";
  if (t.has("parler")) return "Envoie-lui juste : « On peut parler 5 minutes ce soir ? »";
  return "Choisis la plus petite partie et fais-la 10 minutes, minuteur lancé.";
}

function acceptanceFields(t) {
  if (t.has("deuil"))
    return {
      validation: "Perdre quelqu'un qu'on aime, c'est lourd. Ta tristesse a toute sa place.",
      controle: "Écris-lui trois lignes, ou appelle quelqu'un qui l'a connue aussi.",
    };
  if (t.has("emploi"))
    return {
      validation: "Voir ton père perdre son travail, ça secoue toute la maison. Ça ne dépend pas de toi.",
      controle: "Ce soir, passe dix minutes avec lui, sans parler du problème.",
    };
  if (t.has("refus"))
    return {
      validation: "Un refus fait mal, surtout après tant d'efforts. Ta déception est légitime.",
      controle: "Note deux options encore ouvertes, sans décider tout de suite.",
    };
  if (t.has("maladie"))
    return {
      validation: "La maladie d'un proche pèse lourd. C'est normal d'avoir peur pour lui.",
      controle: "Choisis un petit geste pour lui aujourd'hui : un appel, un message, une visite.",
    };
  return {
    validation: "C'est réel, et ça t'échappe. C'est normal que ça pèse.",
    controle: "Choisis une chose que tu contrôles encore aujourd'hui : dormir, manger, appeler un proche.",
  };
}

// Remplit les champs d'une carte pour une zone donnée (tri local, ou carte déplacée).
export function fillLocal(texte, zone, rep = false) {
  const t = topicsOf(texte);
  const base = { texte, zone, pourquoi: WHY[zone](t), prediction: null, question: null, petite_etape: null, validation: null, controle: null, ironie: null };
  if (zone === "scenario") Object.assign(base, scenarioFields(t, rep), { ironie: ironyFor(t, rep) });
  if (zone === "action") base.petite_etape = actionFields(t);
  if (zone === "acceptation") Object.assign(base, acceptanceFields(t));
  return base;
}

/* ---------------------------------------------------------------- Garde-fous sur la sortie */

const FORBIDDEN = [
  /tu vas (y )?(r[ée]ussir|y arriver)/i,
  /ne t'?\s?inqui[eè]te/i,
  /tout (ira|va aller) bien/i,
  /tu exag[eè]res/i,
  /arr[eê]te de dramatiser/i,
  /ce n'?est rien/i,
  /tout va bien/i,
];

export function hasForbidden(s) {
  return typeof s === "string" && FORBIDDEN.some((r) => r.test(s));
}

// L'ironie n'est jamais montrée sur ces thèmes, même en mode direct.
export function ironyAllowed(texte) {
  const t = topicsOf(texte);
  return !["deuil", "maladie", "famille", "argent", "physique", "religion", "notes", "emploi", "honte"].some((k) => t.has(k));
}

const FIELDS = ["prediction", "question", "petite_etape", "validation", "controle", "ironie", "pourquoi"];

// Nettoie une carte venue de l'IA : zone valide, champs hors zone à null, interdits remplacés.
export function sanitize(item, texte, rep) {
  const zone = ["scenario", "action", "acceptation"].includes(item?.zone) ? item.zone : classifyLocal(texte).zone;
  const fallback = fillLocal(texte, zone, rep);
  const out = { texte, zone, corrections: [] };
  for (const f of FIELDS) {
    let v = typeof item?.[f] === "string" && item[f].trim() ? item[f].trim() : null;
    if (v && hasForbidden(v)) {
      out.corrections.push(`réassurance interdite (${f})`);
      v = null;
    }
    out[f] = v;
  }
  if (zone !== "scenario" && out.ironie) {
    out.corrections.push("ironie hors zone scénario");
    out.ironie = null;
  }
  // Champs attendus pour la zone : on complète avec les règles locales si l'IA les a laissés vides.
  const need = { scenario: ["prediction", "question"], action: ["petite_etape"], acceptation: ["validation", "controle"] }[zone];
  for (const f of [...need, "pourquoi"]) if (!out[f]) out[f] = fallback[f];
  for (const f of ["prediction", "question", "petite_etape", "validation", "controle"]) if (!need.includes(f)) out[f] = null;
  // Ironie de secours (montrée seulement en mode direct, zone scénario, thème autorisé).
  out.ironieLocale = zone === "scenario" ? fallback.ironie : null;
  return out;
}

/* ---------------------------------------------------------------- Répétition */

export function repetitionCount(texte, history) {
  const t = topicsOf(texte);
  let n = t.has("repetition") ? 2 : 0;
  for (const h of history) if (similarity(texte, h.texte) >= 0.5) n++;
  return n;
}

/* ---------------------------------------------------------------- Réseau */

async function postJSON(url, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `http_${r.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const ai = { available: false, model: null, checked: false };

export async function checkAI() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch("/api/health", { signal: ctrl.signal, cache: "no-store" });
    const d = await r.json();
    ai.available = Boolean(d.ai);
    ai.model = d.model || null;
  } catch {
    ai.available = false;
    ai.model = null;
  } finally {
    clearTimeout(timer);
    ai.checked = true;
  }
  return ai;
}

/* ---------------------------------------------------------------- Tri complet */

/**
 * @param {string[]} lines
 * @param {{mode:'doux'|'direct', useAI:boolean, override?:boolean, history?:{texte:string}[]}} opts
 * @returns {Promise<{alert:null|object, items:object[], source:'ia'|'local', model?:string, ms:number, fallback?:string}>}
 */
export async function sortWorries(lines, opts) {
  const started = performance.now();
  const { mode, useAI, override = false, history = [], localFilter = true } = opts;
  const clean = lines.map((l) => l.trim()).filter(Boolean).slice(0, 12);

  // 1. Filtre local, avant tout appel réseau (désactivable seulement dans le Labo, pour mesurer l'IA seule).
  let doubts = [];
  if (!override && localFilter) {
    const checks = clean.map((texte) => ({ texte, ...safetyCheck(texte) }));
    const hits = checks.filter((h) => h.alerte);
    if (hits.length) return { alert: { source: "filtre local", lignes: hits.map((h) => h.texte), raison: hits[0].raison }, items: [], source: "local", ms: performance.now() - started };
    doubts = checks.filter((h) => h.doute);
    // Sans IA pour trancher, le doute déclenche l'alerte.
    if (doubts.length && !useAI) return { alert: { source: "filtre local", lignes: doubts.map((h) => h.texte), raison: "expression à vérifier", doute: true }, items: [], source: "local", ms: performance.now() - started };
  }

  const reps = clean.map((texte, i) => repetitionCount(texte, [...history, ...clean.slice(0, i).map((t) => ({ texte: t }))]));

  // 2. Tri par l'IA.
  let fallback = null;
  if (useAI) {
    try {
      const data = await postJSON("/api/sort", { mode, override, worries: clean.map((texte, i) => ({ texte, deja: reps[i] })) }, 50000);
      if (data.securite?.alerte && !override) {
        return { alert: { source: "IA", lignes: clean, raison: data.securite.raison || "danger possible" }, items: [], source: "ia", model: data.model, ms: performance.now() - started };
      }
      const byN = new Map((data.inquietudes || []).map((it, i) => [Number(it.n) || i + 1, it]));
      const items = clean.map((texte, i) => {
        const raw = byN.get(i + 1);
        const card = raw ? sanitize(raw, texte, reps[i] > 0) : { ...sanitize(fillLocal(texte, classifyLocal(texte).zone, reps[i] > 0), texte, reps[i] > 0), local: true };
        return { ...card, repetition: reps[i] };
      });
      return { alert: null, items, source: "ia", model: data.model, ms: performance.now() - started, vigilance: doubts.length > 0 };
    } catch (e) {
      fallback = e.name === "AbortError" ? "délai dépassé" : e.message;
      // L'IA n'a pas pu trancher une expression ambiguë : prudence.
      if (doubts.length) return { alert: { source: "filtre local", lignes: doubts.map((h) => h.texte), raison: "expression à vérifier", doute: true }, items: [], source: "local", fallback, ms: performance.now() - started };
    }
  }

  // 3. Règles locales (hors ligne, ou si l'IA ne répond pas).
  const items = clean.map((texte, i) => {
    const { zone } = classifyLocal(texte);
    return { ...sanitize(fillLocal(texte, zone, reps[i] > 0), texte, reps[i] > 0), repetition: reps[i] };
  });
  return { alert: null, items, source: "local", fallback, ms: performance.now() - started };
}

/* ---------------------------------------------------------------- Replay */

export function localReplayComment({ certitude, pire }) {
  if (pire === "oui") return `C'était aussi dur que prévu, et tu y as fait face. Qu'est-ce qui t'a aidé à tenir, et que garderais-tu pour la prochaine fois ?`;
  if (pire === "en_partie") return `Une partie de ta prédiction s'est réalisée, pas tout. Quelle partie avais-tu surestimée ?`;
  const c = Number(certitude) || 0;
  return `${c ? `Tu étais sûr à ${c} %, et` : "Et"} le pire n'est pas arrivé : la réalité a été différente de ta prédiction. Qu'est-ce que tu en retiens pour la prochaine fois ?`;
}

export async function replayComment(entry, useAI) {
  if (useAI) {
    try {
      const d = await postJSON("/api/replay", entry, 25000);
      if (d.commentaire && !hasForbidden(d.commentaire)) return { commentaire: d.commentaire, source: "ia" };
    } catch {
      /* repli local */
    }
  }
  return { commentaire: localReplayComment(entry), source: "local" };
}

export async function aiSummary(payload) {
  return postJSON("/api/summary", payload, 30000);
}
