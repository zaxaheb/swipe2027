// DELETE /api/compte  (en-tête Authorization: Bearer <jeton de session>) → supprime le compte et toutes ses réponses.
import { userFromToken, del, deleteUser } from "../lib/supa.js";

export default async function handler(req, res) {
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
