// GET  /api/fiche?id=…  → fiche partagée si elle existe (404 sinon)
// POST /api/fiche {id}  → génère la fiche (IA configurée dans LLM_FICHE + recherche web), l'enregistre pour tout le monde
import { build, VARS } from "../lib/prompts.js";
import { FICHE, cleanFiche } from "../lib/schemas.js";
import { mesure, base } from "../lib/data.js";
import { consume } from "../lib/quota.js";
import { rpc, select, upsert } from "../lib/supa.js";
import * as llm from "../lib/llm.js";

export const config = { maxDuration: 90 };
const ID = /^[a-z0-9-]{2,160}$/;

export default async function handler(req, res) {
  const id = String(req.query?.id || req.body?.id || "");
  if (!ID.test(id)) return res.status(400).json({ error: "id" });
  if (base().fiches[id]) return res.status(200).json(base().fiches[id]); // fiche écrite à la main

  const rows = await select("fiches", `id=eq.${id}&select=data`);
  if (rows.length) return res.status(200).json(rows[0].data);
  if (req.method === "GET") return res.status(404).json({ error: "absente" });
  if (req.method !== "POST") return res.status(405).end();

  const m = mesure(id); if (!m) return res.status(404).json({ error: "mesure" });
  if (!(await rpc("take_lock", { p_id: id }))) return res.status(409).json({ error: "en_cours" });
  try {
    if (!(await consume(req, "fiche"))) return res.status(429).json({ error: "quota" });
    const S0 = await build("fiche", VARS.fiche(m)), n = Number(S0.config.max_searches ?? process.env.FICHE_MAX_SEARCHES ?? 3);
    const S = n === 3 ? S0 : await build("fiche", VARS.fiche(m, [], n));
    const { data, provider, model } = await llm.json({ usage: "fiche", spec: S.config.model, system: S.system, messages: [{ role: "user", content: S.user }], schema: FICHE, name: "enregistrer_fiche",
      description: "Enregistre la fiche sourcée finale.", web: { maxSearches: n }, maxTokens: S.config.max_tokens || 5000, trace: { name: "fiche", prompt: S.prompt, tags: ["fiche", "site"], metadata: { mesure: id } } });
    const fiche = { ...cleanFiche(data), genere: true, maj: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), v: S.version, modele: `${provider}:${model}` };
    await upsert("fiches", { id, data: fiche });
    res.status(200).json(fiche);
  } catch (e) {
    res.status(e.code === "credit" ? 503 : e.status || 500).json({ error: e.message === "fiche_incomplete" ? "incomplete" : e.code === "credit" ? "indisponible" : "erreur" });
  } finally {
    await rpc("release_lock", { p_id: id }).catch(() => {});
  }
}
