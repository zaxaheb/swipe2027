// POST /api/contact { type: "contact" | "rejoindre", texte, contact?, role? }
// → enregistre un message dans la table remarques (mesure_id = "_contact"), visible dans l'admin.
import { insert, userFromToken } from "../lib/supa.js";
import { consume } from "../lib/quota.js";

const ROLES = new Set(["verification", "veille", "reseaux", "dev", "autre"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { type, texte, contact, role } = req.body || {};
  const ty = type === "rejoindre" ? "rejoindre" : "contact";
  const t = String(texte || "").trim();
  if (t.length < 5 || t.length > 2000) return res.status(400).json({ error: "texte" });
  const c = String(contact || "").trim().slice(0, 200);
  const r = ROLES.has(role) ? role : "";
  if (!(await consume(req, "remarque"))) return res.status(429).json({ error: "quota" });
  const user = await userFromToken(String(req.headers.authorization || "").replace(/^Bearer\s+/i, "")).catch(() => null);
  const corps = (r ? `[${r}] ` : "") + t + (c ? `\n\nPour répondre : ${c}` : "");
  try {
    await insert("remarques", { mesure_id: "_contact", type: ty, texte: corps, source_url: null, user_id: user ? user.id : null });
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: "erreur" }); }
}
