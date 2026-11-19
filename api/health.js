import { hasKey, modelLabel, PROVIDER } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasKey()) return res.status(200).json({ ai: false, model: null, provider: null });
  let model = null;
  try {
    model = await modelLabel();
  } catch {
    model = PROVIDER;
  }
  res.status(200).json({ ai: true, model, provider: PROVIDER });
}
