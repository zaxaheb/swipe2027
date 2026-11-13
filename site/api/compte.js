// POST   /api/compte  {pseudo, password}  → crée le compte (sans email réel, confirmé d'office).
// DELETE /api/compte  (en-tête Authorization: Bearer <jeton de session>) → supprime le compte et toutes ses réponses.
import { userFromToken, del, deleteUser, createUser } from "../lib/supa.js";
import { consume } from "../lib/quota.js";

const DOMAIN = "users.swipe2027.app";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const pseudo = String(req.body?.pseudo || "").trim().toLowerCase(), password = String(req.body?.password || "");
    if (!/^[a-z0-9_]{3,20}$/.test(pseudo)) return res.status(400).json({ error: "pseudo" });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "mot_de_passe" });
    if (!(await consume(req, "inscription"))) return res.status(429).json({ error: "quota" });
    try { await createUser(`${pseudo}@${DOMAIN}`, password); return res.status(200).json({ ok: true }); }
    catch (e) {
      if (/already|exists|registered/i.test(e.message) || e.status === 422 && /email_exists/.test(e.code || "")) return res.status(409).json({ error: "pris" });
      if (/password/i.test(e.message)) return res.status(400).json({ error: "mot_de_passe" });
      console.error("inscription:", e.message); return res.status(500).json({ error: "erreur", detail: String(e.message).slice(0, 200) });
    }
  }
  if (req.method !== "DELETE") return res.status(405).end();
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const user = await userFromToken(token);
  if (!user) return res.status(401).json({ error: "non_connecte" });
  try {
    await del("profils", `user_id=eq.${user.id}`);
    await deleteUser(user.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "erreur" });
  }
}
