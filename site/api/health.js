// GET /api/health?key=<ADMIN_PASSWORD>  → diagnostic : variables présentes (jamais leur valeur), Supabase, modèles IA configurés.
import { rpc } from "../lib/supa.js";
import * as llm from "../lib/llm.js";

export default async function handler(req, res) {
  const env = ["LLM_CHAT", "LLM_FICHE", "LLM_DEFAULT", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "OPENAI_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "QUOTA_SALT", "ADMIN_PASSWORD"];
  const out = { variables: Object.fromEntries(env.map((k) => [k, !!process.env[k]])), modeles: {} };
  for (const u of ["chat", "fiche"]) { try { const m = llm.pick(u); out.modeles[u] = `${m.provider}:${m.model}`; } catch (e) { out.modeles[u] = "ERREUR : " + e.message; } }
  if (process.env.ADMIN_PASSWORD && req.query?.key !== process.env.ADMIN_PASSWORD) return res.status(200).json({ ...out, note: "ajoute ?key=<ADMIN_PASSWORD> pour tester Supabase et les modèles" });
  try { out.supabase = (await rpc("bump_usage", { p_key: "health", p_kind: "health", p_limit: 100000 })) === true ? "ok" : "réponse inattendue"; }
  catch (e) { out.supabase = "ERREUR : " + String(e.message).slice(0, 300); }
  out.test = {};
  for (const u of ["chat", "fiche"]) {
    try { const r = await llm.text({ usage: u, system: "Réponds seulement : ok", messages: [{ role: "user", content: "test" }], maxTokens: 20 }); out.test[u] = "ok (" + r.text.slice(0, 20) + ")"; }
    catch (e) { out.test[u] = "ERREUR : " + String(e.message).replace(/(sk-[\w-]{8,}|AIza[\w-]{20,})/g, "***").slice(0, 300); }
  }
  res.status(200).json(out);
}
