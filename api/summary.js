import { askJSON, hasKey, modelLabel, readBody, errorInfo } from "./_lib.js";
import { SUMMARY_SYSTEM, SUMMARY_SCHEMA } from "./_prompts.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!hasKey()) return res.status(503).json({ error: "no_key" });

  const b = readBody(req);
  if (b.accord !== true) return res.status(400).json({ error: "no_consent" });
  const faits = Array.isArray(b.faits) ? b.faits.map((f) => String(f).slice(0, 300)).slice(0, 12) : [];
  if (!faits.length) return res.status(400).json({ error: "empty" });

  const user = `Période : ${String(b.periode || "les dernières semaines").slice(0, 60)}\nDonnées :\n- ${faits.join("\n- ")}`;
  try {
    const data = await askJSON({ system: SUMMARY_SYSTEM, user, schema: SUMMARY_SCHEMA, maxTokens: 4000 });
    if (data?.__blocked) throw new Error("blocked");
    return res.status(200).json({
      source: "ia",
      model: await modelLabel(),
      titre: String(data.titre || ""),
      puces: Array.isArray(data.puces) ? data.puces.map(String).slice(0, 6) : [],
    });
  } catch (err) {
    return res.status(502).json({ error: "ai_failed", detail: errorInfo(err) });
  }
}
