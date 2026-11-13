// GET  /api/fiche?id=…  → fiche partagée si elle existe (404 sinon)
// POST /api/fiche {id}  → génère la fiche (Claude + recherche web), l'enregistre pour tout le monde
import { SYSTEM, ficheUser, PROMPT_VERSION } from "../lib/prompts.js";
import { FICHE, cleanFiche } from "../lib/schemas.js";
import { mesure, base } from "../lib/data.js";
import { consume } from "../lib/quota.js";
import { rpc, select, upsert } from "../lib/supa.js";
import { messages } from "../lib/anthropic.js";

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
    const tools = [
      { type: "web_search_20250305", name: "web_search", max_uses: 6 },
      { name: "enregistrer_fiche", description: "Enregistre la fiche sourcée finale. À appeler une seule fois, à la fin.", input_schema: FICHE }
    ];
    const msgs = [{ role: "user", content: ficheUser(m) }];
    let d, call;
    for (let i = 0; i < 3 && !call; i++) {           // la recherche web peut demander plusieurs tours (pause_turn)
      d = await messages({ max_tokens: 5000, system: SYSTEM.fiche, tools, messages: msgs });
      call = (d.content || []).find((c) => c.type === "tool_use" && c.name === "enregistrer_fiche");
      if (call || d.stop_reason !== "pause_turn") break;
      msgs.push({ role: "assistant", content: d.content });
    }
    if (!call) throw Object.assign(new Error("pas_de_fiche"), { status: 502 });
    const fiche = { ...cleanFiche(call.input), genere: true, maj: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), v: PROMPT_VERSION };
    await upsert("fiches", { id, data: fiche });
    res.status(200).json(fiche);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message === "fiche_incomplete" ? "incomplete" : "erreur" });
  } finally {
    await rpc("release_lock", { p_id: id }).catch(() => {});
  }
}
