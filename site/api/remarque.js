// POST /api/remarque { mesureId, type, texte, url? }  → enregistre une remarque (anonyme, ou liée au compte si connecté)
import { insert, userFromToken } from "../lib/supa.js";
import { consume } from "../lib/quota.js";
import { base } from "../lib/data.js";

const TYPES = new Set(["erreur", "source", "point_de_vue", "mesure", "autre"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { mesureId, type, texte, url } = req.body || {};
  if (!base().byId[mesureId]) return res.status(400).json({ error: "mesure" });
  const t = String(texte || "").trim();
  if (t.length < 5 || t.length > 1500) return res.status(400).json({ error: "texte" });
  const u = String(url || "").trim();
  if (u && !/^https?:\/\/\S{3,500}$/.test(u)) return res.status(400).json({ error: "url" });
  if (!(await consume(req, "remarque"))) return res.status(429).json({ error: "quota" });
  const user = await userFromToken(String(req.headers.authorization || "").replace(/^Bearer\s+/i, "")).catch(() => null);
  try {
    await insert("remarques", { mesure_id: mesureId, type: TYPES.has(type) ? type : "autre", texte: t, source_url: u || null, user_id: user ? user.id : null });
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: "erreur" }); }
}
