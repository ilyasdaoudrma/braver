// État de BRAVER. Rien ne quitte l'appareil : localStorage avec accord, sinon sessionStorage.
const KEY = "braver.v1";

const defaults = () => ({
  v: 1,
  consent: null, // null = pas encore demandé, true = garder sur l'appareil, false = session seulement
  mode: "doux",
  forceLocal: false,
  draft: "",
  current: null, // dernier tri
  history: [], // {id, texte, zone, date}
  replays: [], // {id, texte, prediction, question, certitude, quand, createdAt, status, reel, pire, commentaire, source, demo}
  actions: [], // {id, texte, etape, peur, doneAt, demo}
  acceptances: [], // {id, texte, emotion, controle, doneAt}
  demo: false,
});

function read(getStorage) {
  try {
    const raw = getStorage().getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const state = Object.assign(defaults(), read(() => localStorage) || read(() => sessionStorage) || {});

export function save() {
  const json = JSON.stringify(state);
  try {
    if (state.consent === true) {
      localStorage.setItem(KEY, json);
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, json);
      localStorage.removeItem(KEY);
    }
  } catch {
    /* stockage indisponible : l'app continue en mémoire */
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* rien */
  }
  const mode = state.mode;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaults(), { mode });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
