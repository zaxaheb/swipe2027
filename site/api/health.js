// GET /api/health?key=<ADMIN_PASSWORD>  → diagnostic : variables présentes (jamais leur valeur), Supabase, Anthropic.
import { rpc } from "../lib/supa.js";

export default async function handler(req, res) {
  const env = ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "QUOTA_SALT", "ADMIN_PASSWORD"];
  const out = { variables: Object.fromEntries(env.map((k) => [k, !!process.env[k]])), modele: process.env.ANTHROPIC_MODEL || null };
  if (process.env.ADMIN_PASSWORD && req.query?.key !== process.env.ADMIN_PASSWORD) return res.status(200).json({ ...out, note: "ajoute ?key=<ADMIN_PASSWORD> pour tester Supabase et Anthropic" });
  try { out.supabase = (await rpc("bump_usage", { p_key: "health", p_kind: "health", p_limit: 100000 })) === true ? "ok" : "réponse inattendue"; }
  catch (e) { out.supabase = "ERREUR : " + String(e.message).slice(0, 300); }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL, max_tokens: 5, messages: [{ role: "user", content: "ok" }] }) });
    out.anthropic = r.ok ? "ok" : `ERREUR ${r.status} : ${(await r.text()).slice(0, 300)}`;
  } catch (e) { out.anthropic = "ERREUR : " + String(e.message).slice(0, 200); }
  res.status(200).json(out);
}
