// Keyword rules from the prototype (legacy/js/engine.js), without irony. Since M2 (#20) the on-device zone comes
// from the trained model (lib/zones/model.ts); `deviceZone` is only its fallback while the model is not loaded.
// `fillFields` gives the on-device card texts for every zone.
import type { Zone } from "../types";
import { hasAny, normalize, prep } from "../text";

const T = prep;

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
};

type Topic = keyof typeof TOPICS;

function topicsOf(text: string): Set<Topic> {
  const norm = normalize(text);
  return new Set((Object.keys(TOPICS) as Topic[]).filter((k) => hasAny(norm, TOPICS[k])));
}

const CUES: Record<Zone, readonly [number, readonly string[]][]> = {
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
    [2, [...TOPICS.refus, ...TOPICS.maladie, ...T(["divorce", "se separent", "separes", "تطلقو", "طلاق", "tl9o", "tle9o", "on n a pas d argent", "pas les moyens", "peux rien y faire", "peux rien faire", "ma bidi ma ndir", "ما بيدي", "si seulement", "j aurais du", "كون غير", "kon ghir", "ضيعت"])]],
    [1, T(["situation", "crise", "decision", "le passe", "c etait", "c est arrive", "a perdu", "ont decide", "malheureusement", "grave", "regrette"])],
  ],
};

const TIE_ORDER: readonly Zone[] = ["acceptation", "action", "scenario"];

export interface DeviceZone {
  zone: Zone;
  scores: Record<Zone, number>;
  /** False when no cue matched (the zone is a default guess). */
  sure: boolean;
}

/** Keyword-rule zone for one worry (interim on-device model). */
export function deviceZone(text: string): DeviceZone {
  const norm = normalize(text);
  const scores: Record<Zone, number> = { scenario: 0, action: 0, acceptation: 0 };
  for (const zone of Object.keys(CUES) as Zone[]) {
    for (const [weight, patterns] of CUES[zone]) for (const p of patterns) if (hasAny(norm, [p])) scores[zone] += weight;
  }
  const best = TIE_ORDER.reduce<Zone>((acc, z) => (scores[z] > scores[acc] ? z : acc), "scenario");
  return { zone: best, scores, sure: scores[best] > 0 };
}

export interface ZoneFields {
  why: string;
  prediction: string | null;
  question: string | null;
  step: string | null;
  validation: string | null;
  control: string | null;
}

function why(zone: Zone, t: Set<Topic>): string {
  if (zone === "scenario")
    return t.has("prof") || t.has("regard")
      ? "C'est une interprétation : tu ne sais pas encore ce que les autres pensent vraiment."
      : "C'est une prédiction : ça n'a pas encore eu lieu.";
  if (zone === "action") return "C'est réel, et tu as une prise dessus, même petite.";
  return t.has("refus") ? "C'est une décision d'autrui : elle t'échappe, même si la suite reste à toi." : "C'est réel, et ça ne dépend pas de toi.";
}

function scenario(t: Set<Topic>, repeated: boolean): Pick<ZoneFields, "prediction" | "question"> {
  const pick = (): [string, string] => {
    if (t.has("entretien")) return ["Tu prédis que l'entretien va mal se passer.", "Qu'est-ce qui te prouve, aujourd'hui, que tu vas bloquer ?"];
    if (t.has("regard") || t.has("expose"))
      return ["Tu prédis que les autres vont se moquer de toi.", "La dernière fois que quelqu'un a présenté, combien se sont vraiment moqués ?"];
    if (t.has("prof")) return ["Tu interprètes ta note comme la preuve que ton prof te déteste.", "Quelles autres explications possibles pour cette note ?"];
    if (t.has("examen"))
      return ["Tu prédis un échec, et que tout s'arrêterait avec.", "Si ça arrivait vraiment, quelle serait la toute première chose que tu ferais ?"];
    if (t.has("famille")) return ["Tu prédis une réaction très dure de ta famille.", "La dernière fois, comment ça s'est vraiment passé ?"];
    return ["Ton esprit prédit le pire, avant que ça ait eu lieu.", "Sur 10 fois où tu as pensé ça, combien de fois c'est vraiment arrivé ?"];
  };
  const [prediction, question] = pick();
  return { prediction, question: repeated ? "On revient à la même question. Tu cherches une info, ou une certitude ?" : question };
}

function step(t: Set<Topic>): string {
  if (t.has("dossier")) return "Ouvre le mail, joins le dossier tel qu'il est, et envoie-le. Dix minutes, pas plus.";
  if (t.has("reviser") || t.has("examen")) return "Lance un minuteur de 10 minutes et lis seulement le premier titre du cours.";
  if (t.has("parler")) return "Envoie-lui juste : « On peut parler 5 minutes ce soir ? »";
  return "Choisis la plus petite partie et fais-la 10 minutes, minuteur lancé.";
}

function acceptance(t: Set<Topic>): Pick<ZoneFields, "validation" | "control"> {
  if (t.has("deuil"))
    return { validation: "Perdre quelqu'un qu'on aime, c'est lourd. Ta tristesse a toute sa place.", control: "Écris-lui trois lignes, ou appelle quelqu'un qui l'a connue aussi." };
  if (t.has("emploi"))
    return { validation: "Voir un proche perdre son travail, ça secoue toute la maison. Ça ne dépend pas de toi.", control: "Ce soir, passe dix minutes avec lui, sans parler du problème." };
  if (t.has("refus"))
    return { validation: "Un refus fait mal, surtout après tant d'efforts. Ta déception est légitime.", control: "Note deux options encore ouvertes, sans décider tout de suite." };
  if (t.has("maladie"))
    return { validation: "La maladie d'un proche pèse lourd. C'est normal d'avoir peur pour lui.", control: "Choisis un petit geste pour lui aujourd'hui : un appel, un message, une visite." };
  return {
    validation: "C'est réel, et ça t'échappe. C'est normal que ça pèse.",
    control: "Choisis une chose que tu contrôles encore aujourd'hui : dormir, manger, appeler un proche.",
  };
}

/** Card texts for a worry in a given zone (on-device sort, moved card, or fallback for an empty LLM field). */
export function fillFields(text: string, zone: Zone, repeated = false): ZoneFields {
  const t = topicsOf(text);
  const empty = { prediction: null, question: null, step: null, validation: null, control: null };
  if (zone === "scenario") return { ...empty, why: why(zone, t), ...scenario(t, repeated) };
  if (zone === "action") return { ...empty, why: why(zone, t), step: step(t) };
  return { ...empty, why: why(zone, t), ...acceptance(t) };
}
