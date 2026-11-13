// POST /api/chat  { mode: "general" | "mesure" | "profil", mesureId?, messages?: [{role,content}], choix?: {pour:[ids], contre:[ids]} }
// Le navigateur n'envoie JAMAIS de prompt système : il est construit ici.
import { SYSTEM, PROMPT_VERSION } from "../lib/prompts.js";
import { retrieve, mesure, base } from "../lib/data.js";
import { consume } from "../lib/quota.js";
import { messages, textOf } from "../lib/anthropic.js";
import { select, insert } from "../lib/supa.js";

const cleanMsgs = (arr) => (Array.isArray(arr) ? arr : []).slice(-12)
  .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 2000) }))
  .filter((m) => m.content);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { mode = "general", mesureId, choix } = req.body || {};
  try {
    let system, msgs;
    if (mode === "profil") {
      if (!(await consume(req, "profil"))) return res.status(429).json({ error: "quota" });
      const B = base(); const L = (ids) => (ids || []).slice(-60).map((id) => B.byId[id]).filter(Boolean).map((m) => `- [${B.candidats[m.P]?.cand}] ${m.t}`).join("\n");
      system = SYSTEM.profil; msgs = [{ role: "user", content: `POUR :\n${L(choix?.pour)}\n\nCONTRE :\n${L(choix?.contre)}` }];
    } else {
      msgs = cleanMsgs(req.body?.messages);
      if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "messages" });
      if (!(await consume(req, "chat"))) return res.status(429).json({ error: "quota" });
      if (mode === "mesure") {
        const m = mesure(mesureId); if (!m) return res.status(404).json({ error: "mesure" });
        let fiche = base().fiches[mesureId] || null;
        if (!fiche) { const r = await select("fiches", `id=eq.${encodeURIComponent(mesureId)}&select=data`).catch(() => []); fiche = r[0]?.data || null; }
        system = SYSTEM.mesure(m, fiche);
      } else system = SYSTEM.general(retrieve(msgs[msgs.length - 1].content));
    }
    const d = await messages({ max_tokens: 700, system, messages: msgs });
    const text = textOf(d);
    // Journal anonyme : ni IP, ni compte, ni historique ; seulement la dernière question et la réponse.
    if (mode !== "profil") await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: PROMPT_VERSION }).catch(() => {});
    res.status(200).json({ text, v: PROMPT_VERSION });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status === 429 ? "rate_limited" : "erreur" });
  }
}
