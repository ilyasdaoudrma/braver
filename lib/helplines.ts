// Moroccan help numbers shown on the safety screen.
// Source: TherapyRoute (citing ANRT, Ministry of Health, ONDE and UNFM), checked August 2026 (from legacy/js/data.js).

export interface Helpline {
  name: string;
  who: string;
  /** Main number to dial, null when there is no number (hospital emergency). */
  tel: string | null;
  /** Extra line shown under the number. */
  extra: string | null;
  /** Second dialable number, if any. */
  tel2: string | null;
}

export const HELPLINES: readonly Helpline[] = [
  { name: "Police", who: "Danger immédiat, pour tout le monde", tel: "19", extra: "ou 112 depuis un mobile", tel2: "112" },
  { name: "SAMU · Protection civile", who: "Urgence médicale", tel: "15", extra: "certaines sources indiquent 150", tel2: "150" },
  { name: "Gendarmerie royale", who: "Zones rurales", tel: "177", extra: null, tel2: null },
  { name: "Centre d'écoute 2511 (ONDE)", who: "Jeunes de moins de 18 ans · gratuit, 9 h – 16 h", tel: "2511", extra: "ou 0800 00 2511", tel2: "0800002511" },
  { name: "Kolona Maak (UNFM)", who: "Femmes et filles face à la violence", tel: "8350", extra: "numéro vert", tel2: null },
  { name: "Urgences de l'hôpital", who: "Pour tout le monde, sans rendez-vous", tel: null, extra: "À Oujda : CHU Mohammed VI", tel2: null },
];

/** Ready-to-send message for a trusted person. */
export const TRUSTED_MESSAGE = "J'ai besoin de te parler. Tu peux m'appeler ?";
