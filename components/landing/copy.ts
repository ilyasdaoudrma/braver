import type { Lang } from "@/lib/i18n";

/** Landing page text, French (default) and English. Short on purpose: one idea per line. */
const FR = {
  nav: { how: "Comment ça marche", safety: "Sécurité", proof: "Preuves", open: "Ouvrir l'app" },
  hero: {
    l1: "Vide ta",
    l2: "tête.",
    sub: "Écris ce qui t'inquiète. BRAVER le range en trois zones et te propose un petit pas.",
    start: "Commencer, c'est gratuit",
    how: "Voir comment ça marche",
    scroll: ["Fais défiler", "& découvre"],
  },
  zones: {
    eyebrow: "TROIS ZONES",
    title: ["Chaque inquiétude a sa", "place."],
    lede: "Une IA lit ce que tu écris et te dit de quel genre d'inquiétude il s'agit. Ensuite, une seule chose à faire.",
    items: [
      {
        key: "scenario",
        name: "Scénario",
        what: "Une prédiction ou une interprétation.",
        example: "« Je vais rater mon exam. »",
        then: "Tu notes ta prédiction. Plus tard, tu compares avec ce qui s'est vraiment passé.",
      },
      {
        key: "action",
        name: "Action",
        what: "Un vrai problème sur lequel tu peux agir.",
        example: "« Je n'ai pas commencé mon rapport. »",
        then: "Un seul pas de moins de 15 minutes, avec un minuteur.",
      },
      {
        key: "acceptation",
        name: "Acceptation",
        what: "Réel, mais hors de ton contrôle.",
        example: "« Mon père est malade. »",
        then: "Tu le reconnais, puis tu gardes une chose qui dépend encore de toi.",
      },
    ],
  },
  safety: {
    eyebrow: "LA SÉCURITÉ D'ABORD",
    title: ["Si ça va", "vraiment", "mal, on s'arrête."],
    lede: "Avant tout envoi, ton téléphone vérifie le message. S'il y a un danger, BRAVER arrête tout et te montre qui appeler.",
    points: [
      { t: "Sur ton téléphone", d: "Le modèle de sécurité tourne dans ton navigateur, même sans réseau." },
      { t: "Tes données restent chez toi", d: "Pas de compte, pas de base de données. Seule la phrase à trier part, sans ton nom." },
      { t: "Des numéros marocains", d: "Un message prêt à envoyer à un proche, et les bons numéros." },
    ],
    numbers: [
      { n: "19", l: "Police" },
      { n: "112", l: "Police, depuis un mobile" },
      { n: "15", l: "SAMU" },
      { n: "177", l: "Gendarmerie" },
      { n: "2511", l: "ONDE, moins de 18 ans" },
      { n: "8350", l: "Kolona Maak" },
    ],
  },
  proof: {
    eyebrow: "MESURÉ, PAS PROMIS",
    title: ["Des chiffres", "vérifiables."],
    lede: "Mesurés sur des phrases jamais vues pendant l'entraînement. Tronqués, jamais arrondis vers le haut.",
    safetyDevice: "des messages en danger repérés sur le téléphone, sans réseau",
    safetyOnline: "messages en danger repérés avec l'app en ligne",
    zones: "bonne zone trouvée par le modèle du téléphone",
    caveat: "Les phrases de test sont traduites ou générées par une IA, pas écrites par de vrais utilisateurs.",
    labo: "Voir tous les chiffres dans le Labo",
  },
  end: {
    title: ["Commence", "maintenant."],
    lede: "Deux minutes suffisent. Tu peux tout effacer quand tu veux.",
    start: "Vider ma tête",
    note: "Pas de compte  ·  Gratuit  ·  Données sur ton téléphone",
    disclaimer: "BRAVER n'est pas un service médical et ne pose pas de diagnostic. En danger immédiat : 19 (ou 112 depuis un mobile) ou 15.",
    made: "Fait à Oujda pour le hackathon du 22 novembre 2026.",
    links: { labo: "Labo", help: "Besoin d'aide", app: "Ouvrir l'app" },
  },
};

type Copy = typeof FR;

const EN: Copy = {
  nav: { how: "How it works", safety: "Safety", proof: "Proof", open: "Open the app" },
  hero: {
    l1: "Clear your",
    l2: "head.",
    sub: "Write down what worries you. BRAVER sorts it into three zones and suggests one small step.",
    start: "Start, it's free",
    how: "See how it works",
    scroll: ["Scroll down", "& discover"],
  },
  zones: {
    eyebrow: "THREE ZONES",
    title: ["Every worry has its", "place."],
    lede: "An AI reads what you write and tells you what kind of worry it is. Then, just one thing to do.",
    items: [
      {
        key: "scenario",
        name: "Scenario",
        what: "A prediction or an interpretation.",
        example: "“I'm going to fail my exam.”",
        then: "You note your prediction. Later, you compare it with what really happened.",
      },
      {
        key: "action",
        name: "Action",
        what: "A real problem you can act on.",
        example: "“I haven't started my report.”",
        then: "One step under 15 minutes, with a timer.",
      },
      {
        key: "acceptation",
        name: "Acceptance",
        what: "Real, but out of your control.",
        example: "“My father is ill.”",
        then: "You acknowledge it, then keep one thing that still depends on you.",
      },
    ],
  },
  safety: {
    eyebrow: "SAFETY FIRST",
    title: ["If things are", "really", "bad, we stop."],
    lede: "Before anything is sent, your phone checks the message. If there is danger, BRAVER stops everything and shows you who to call.",
    points: [
      { t: "On your phone", d: "The safety model runs in your browser, even with no network." },
      { t: "Your data stays with you", d: "No account, no database. Only the sentence being sorted is sent, without your name." },
      { t: "Moroccan numbers", d: "A ready message for someone close, and the right numbers." },
    ],
    numbers: [
      { n: "19", l: "Police" },
      { n: "112", l: "Police, from a mobile" },
      { n: "15", l: "Ambulance (SAMU)" },
      { n: "177", l: "Gendarmerie" },
      { n: "2511", l: "ONDE, under 18" },
      { n: "8350", l: "Kolona Maak" },
    ],
  },
  proof: {
    eyebrow: "MEASURED, NOT PROMISED",
    title: ["Numbers you can", "check."],
    lede: "Measured on sentences never seen during training. Truncated, never rounded up.",
    safetyDevice: "of danger messages caught on the phone, with no network",
    safetyOnline: "danger messages caught with the app online",
    zones: "right zone found by the on-phone model",
    caveat: "Test sentences are translated or generated by an AI, not written by real users.",
    labo: "See every number in the Lab",
  },
  end: {
    title: ["Start", "now."],
    lede: "Two minutes is enough. You can erase everything whenever you want.",
    start: "Clear my head",
    note: "No account  ·  Free  ·  Data on your phone",
    disclaimer: "BRAVER is not a medical service and gives no diagnosis. In immediate danger: 19 (or 112 from a mobile) or 15.",
    made: "Made in Oujda for the 22 November 2026 hackathon.",
    links: { labo: "Lab", help: "Need help", app: "Open the app" },
  },
};

export function landingCopy(lang: Lang): Copy {
  return lang === "en" ? EN : FR;
}

export type LandingCopy = Copy;
