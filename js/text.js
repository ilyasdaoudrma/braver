// Normalisation du texte : français (accents), darija latine (chiffres-lettres) et arabe.

export function normalize(input) {
  let s = String(input || "").toLowerCase();
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); // accents latins
  s = s
    .replace(/[ً-ْٰـ]/g, "") // harakat, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
  s = s.replace(/[’`´]/g, "'");
  // Tout ce qui n'est ni lettre latine, ni chiffre, ni lettre arabe devient un espace.
  s = s.replace(/[^a-z0-9ء-ي\s]/g, " ");
  return ` ${s.replace(/\s+/g, " ").trim()} `;
}

export function compact(norm) {
  return norm.replace(/\s+/g, "");
}

// Vrai si le texte normalisé contient l'un des motifs (normalisés à l'avance).
export function hasAny(norm, patterns) {
  const flat = compact(norm);
  return patterns.some((p) => norm.includes(p) || (p.trim().includes(" ") && /[ء-ي]/.test(p) && flat.includes(compact(p))));
}

export function prep(patterns) {
  return patterns.map((p) => {
    const n = normalize(p);
    // On garde les espaces de bord seulement pour les mots courts, afin d'éviter les faux positifs.
    return p.trim().length <= 4 ? n : n.trim();
  });
}

const STOP = new Set(
  "je j me m te t tu il elle on nous vous ils elles le la les l un une des de du d a au aux et ou mais si que qu qui ce c ca cest est suis es sont va vais vont pas ne n plus mon ma mes ton ta tes son sa ses pour par sur dans avec en y deja encore trop tres fois ana nta nti dyal f fi mn w o ou ghadi ma chi".split(
    " "
  )
);

export function tokens(text) {
  return normalize(text)
    .trim()
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export function similarity(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function isArabic(s) {
  return /[؀-ۿ]/.test(String(s || ""));
}
