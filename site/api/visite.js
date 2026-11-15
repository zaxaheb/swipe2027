// POST { vue, connecte } → compte une visite (mesure d'audience maison, voir supabase/migration-004.sql).
// Pas de cookie : l'empreinte (IP + navigateur + jour) est hachée avec un sel et n'est jamais stockée en clair.
import { createHash } from "node:crypto";
import { rpc } from "../lib/supa.js";

const VUES = new Set(["swipe", "votes", "cond", "chat", "profil"]);
const BOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|headless|lighthouse/i;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ua = String(req.headers["user-agent"] || "");
  if (!ua || BOT.test(ua)) return res.status(204).end();
  let b = req.body || {}; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const jour = new Date().toISOString().slice(0, 10);
  const v = createHash("sha256").update([ip, ua, jour, process.env.QUOTA_SALT || "swipe2027"].join("|")).digest("hex").slice(0, 32);
  try { await rpc("track_visite", { p_v: v, p_connecte: !!b.connecte, p_vue: VUES.has(b.vue) ? b.vue : "autre" }); } catch (e) { /* la mesure d'audience ne doit jamais casser le site */ }
  res.status(204).end();
}
