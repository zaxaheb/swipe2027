// POST { t: { "de>vers": n }, e: { "evenement": n } } → compteurs agrégés des parcours dans l'app (v2).
// Aucun identifiant : ni IP, ni empreinte, ni cookie. On additionne seulement des compteurs par jour (voir supabase/migration-005.sql).
import { rpc } from "../lib/supa.js";

const BOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|headless|lighthouse/i;
const KEY = /^[a-z0-9:>_-]{1,60}$/;   // écrans et événements : minuscules, chiffres, « : », « > », « - »

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (BOT.test(String(req.headers["user-agent"] || ""))) return res.status(204).end();
  let b = req.body || {}; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const out = {};
  for (const [pre, obj] of [["t:", b.t], ["e:", b.e]]) {
    if (!obj || typeof obj !== "object") continue;
    for (const [k, n] of Object.entries(obj).slice(0, 60)) {
      const c = Math.min(50, Math.max(0, parseInt(n, 10) || 0));   // une page ne peut pas gonfler un compteur
      if (c && KEY.test(k)) out[pre + k] = c;
    }
  }
  if (Object.keys(out).length) { try { await rpc("track_flux", { p: out }); } catch (e) { /* la mesure ne doit jamais casser le site */ } }
  res.status(204).end();
}
