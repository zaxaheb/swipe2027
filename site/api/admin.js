// Tableau de bord privé. En-tête x-admin-key = variable d'environnement ADMIN_PASSWORD.
// GET                 → statistiques, dernières questions, fiches générées
// DELETE ?fiche=<id>  → supprime une fiche générée (elle pourra être régénérée)
import { timingSafeEqual } from "node:crypto";
import { rpc, select, del } from "../lib/supa.js";
import { consume } from "../lib/quota.js";
import { base } from "../lib/data.js";

function ok(req) {
  const a = Buffer.from(String(req.headers["x-admin-key"] || "")), b = Buffer.from(String(process.env.ADMIN_PASSWORD || ""));
  return b.length >= 8 && a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!(await consume(req, "admin"))) return res.status(429).json({ error: "quota" });
  if (!ok(req)) return res.status(401).json({ error: "mot_de_passe" });
  try {
    if (req.method === "DELETE") {
      const id = String(req.query?.fiche || "");
      if (!/^[a-z0-9-]{2,160}$/.test(id)) return res.status(400).json({ error: "id" });
      await del("fiches", `id=eq.${id}`);
      return res.status(200).json({ ok: true });
    }
    const B = base();
    const info = (id) => { const m = B.byId[id]; return m ? { t: m.t, cand: B.candidats[m.P]?.cand || m.P } : { t: id, cand: "?" }; };
    const [stats, chats, fiches] = await Promise.all([
      rpc("admin_stats", {}),
      select("chats", "select=created_at,mode,mesure_id,question,reponse&order=created_at.desc&limit=150"),
      select("fiches", "select=id,created_at,data&order=created_at.desc&limit=200")
    ]);
    stats.top = (stats.top || []).map((x) => ({ ...x, ...info(x.id) }));
    res.status(200).json({
      stats,
      chats: chats.map((c) => ({ ...c, mesure: c.mesure_id ? info(c.mesure_id) : null })),
      fiches: fiches.map((f) => ({ id: f.id, created_at: f.created_at, resume: f.data?.resume, ...info(f.id) })),
      candidats: Object.fromEntries(Object.entries(B.candidats).map(([k, v]) => [k, { cand: v.cand, n: B.mesures.filter((m) => m.P === k).length }]))
    });
  } catch (e) {
    res.status(500).json({ error: "erreur", detail: String(e.message || e).slice(0, 300) });
  }
}
