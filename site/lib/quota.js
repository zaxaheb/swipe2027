// Quota d'IA par adresse IP (hachée, jamais stockée en clair).
import { createHash } from "node:crypto";
import { rpc, select } from "./supa.js";

export const LIMITES = { chat: Number(process.env.QUOTA_CHAT || 30), fiche: Number(process.env.QUOTA_FICHE || 3), profil: Number(process.env.QUOTA_PROFIL || 20), admin: 60, inscription: 5, remarque: Number(process.env.QUOTA_REMARQUE || 10) };

export function ipKey(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  return createHash("sha256").update(ip + (process.env.QUOTA_SALT || "swipe2027")).digest("hex").slice(0, 32);
}

/** true si l'appel est autorisé (et le compte), false si le quota du jour est atteint. */
export async function consume(req, kind) {
  return rpc("bump_usage", { p_key: ipKey(req), p_kind: kind, p_limit: LIMITES[kind] });
}

/** true s'il reste du quota aujourd'hui, SANS le consommer. On ne compte ensuite (consume) que les réponses réussies : une erreur de l'IA ne coûte rien au visiteur. */
export async function peek(req, kind) {
  try {
    const r = await select("usage", `select=n&cle=eq.${ipKey(req)}&kind=eq.${kind}&jour=eq.${new Date().toISOString().slice(0, 10)}`);
    return (r[0]?.n || 0) < LIMITES[kind];
  } catch { return true; }
}
