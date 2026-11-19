import { askJSON, hasKey, modelLabel, readBody, errorInfo } from "./_lib.js";
import { SORT_SYSTEM, SORT_SCHEMA } from "./_prompts.js";

const MAX_LINES = 12;
const MAX_CHARS = 500;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!hasKey()) return res.status(503).json({ error: "no_key" });

  const body = readBody(req);
  const mode = body.mode === "direct" ? "direct" : "doux";
  const override = body.override === true;
  const worries = Array.isArray(body.worries) ? body.worries : [];
  const lines = worries
    .map((w) => ({
      texte: String(w?.texte ?? w ?? "").trim().slice(0, MAX_CHARS),
      deja: Number.isInteger(w?.deja) ? w.deja : 0,
    }))
    .filter((w) => w.texte)
    .slice(0, MAX_LINES);
  if (!lines.length) return res.status(400).json({ error: "empty" });

  const list = lines
    .map((w, i) => `${i + 1}. ${w.texte}${w.deja > 0 ? `  (déjà écrite ${w.deja} fois)` : ""}`)
    .join("\n");
  const user =
    `Mode : ${mode}\n` +
    (override ? "La personne a confirmé qu'elle n'est pas en danger (bouton « On s'est mal compris »).\n" : "") +
    `Inquiétudes :\n${list}`;

  const started = Date.now();
  try {
    const data = await askJSON({ system: SORT_SYSTEM, user, schema: SORT_SCHEMA });
    const model = await modelLabel();
    // Texte bloqué par le filtre du fournisseur : on le traite comme une alerte (dans le doute, on alerte).
    if (data?.__blocked) {
      return res.status(200).json({ source: "ia", model, ms: Date.now() - started, securite: { alerte: true, raison: "contenu sensible" }, inquietudes: [] });
    }
    const alerte = Boolean(data?.securite?.alerte);
    const items = Array.isArray(data?.inquietudes) ? data.inquietudes : [];
    return res.status(200).json({
      source: "ia",
      model,
      ms: Date.now() - started,
      securite: { alerte, raison: data?.securite?.raison ?? null },
      inquietudes: alerte ? [] : items,
    });
  } catch (err) {
    return res.status(502).json({ error: "ai_failed", detail: errorInfo(err) });
  }
}
