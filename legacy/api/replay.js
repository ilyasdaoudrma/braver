import { askJSON, hasKey, modelLabel, readBody, errorInfo } from "./_lib.js";
import { REPLAY_SYSTEM, REPLAY_SCHEMA } from "./_prompts.js";

const PIRE = { oui: "oui, le pire est arrivé", en_partie: "en partie", non: "non, le pire n'est pas arrivé" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!hasKey()) return res.status(503).json({ error: "no_key" });

  const b = readBody(req);
  const prediction = String(b.prediction || "").slice(0, 400);
  const reel = String(b.reel || "").slice(0, 600);
  const certitude = Number(b.certitude) || 0;
  if (!prediction || !reel) return res.status(400).json({ error: "empty" });

  const user =
    `Prédiction avant : ${prediction}\n` +
    `Certitude avant : ${certitude} %\n` +
    `Ce qui s'est vraiment passé : ${reel}\n` +
    `Le pire est-il arrivé ? ${PIRE[b.pire] || "non précisé"}`;
  try {
    const data = await askJSON({ system: REPLAY_SYSTEM, user, schema: REPLAY_SCHEMA, maxTokens: 4000 });
    if (data?.__blocked || !data?.commentaire) throw new Error("no_comment");
    return res.status(200).json({ source: "ia", model: await modelLabel(), commentaire: String(data.commentaire) });
  } catch (err) {
    return res.status(502).json({ error: "ai_failed", detail: errorInfo(err) });
  }
}
