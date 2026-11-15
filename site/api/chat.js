// POST /api/chat  { mode: "general" | "mesure" | "profil", mesureId?, messages?: [{role,content}], choix?: {pour:[ids], contre:[ids]} }
// Le navigateur n'envoie JAMAIS de prompt système : il est construit ici.
import { getSystem, VARS, PROMPT_VERSION } from "../lib/prompts.js";
import { retrieve, mesure, base } from "../lib/data.js";
import { consume } from "../lib/quota.js";
import * as llm from "../lib/llm.js";
import { select, insert } from "../lib/supa.js";

const cleanMsgs = (arr) => (Array.isArray(arr) ? arr : []).slice(-12)
  .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 2000) }))
  .filter((m) => m.content);

export const config = { maxDuration: 300 };

/** Les erreurs sont aussi rangées dans le journal des chats : elles apparaissent en rouge dans /admin. */
const logErr = (mode, mesureId, msgs, e) => insert("chats", { mode: mode || "general", mesure_id: mode === "mesure" ? String(mesureId || "").slice(0, 160) : null,
  question: String(msgs?.[msgs.length - 1]?.content || "").slice(0, 1000),
  reponse: ("⚠️ ERREUR : " + hide(e?.message || e)).slice(0, 600), v: PROMPT_VERSION }).catch(() => {});

const MAX_SEARCH = () => Number(process.env.CHAT_MAX_SEARCHES || 10);
const QUIZ = { type: "object", required: ["questions"], properties: { questions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", required: ["q", "options", "bonne", "explication"], properties: {
  q: { type: "string" }, options: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" } }, bonne: { type: "integer", description: "index (0 = première option) de la bonne réponse" }, explication: { type: "string" } } } } } };
const hide = (s) => String(s || "").replace(/(sk-[\w-]{8,}|AIza[\w-]{20,})/g, "***");
const errKind = (e) => e.code === "credit" ? "indisponible" : e.code === "overloaded" ? "surcharge" : e.status === 429 ? "rate_limited" : "erreur";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { mode = "general", mesureId, choix } = req.body || {};
  const sujet = String(req.body?.sujet || "la politique française").replace(/[<>`]/g, "").slice(0, 80);
  try {
    if (mode === "quiz") {                          // quiz QCM structuré, sans recherche web (rapide)
      const msgs = cleanMsgs(req.body?.messages); if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "messages" });
      if (!(await consume(req, "chat"))) return res.status(429).json({ error: "quota" });
      const S = await getSystem("quiz", VARS.quiz(sujet));
      const { data } = await llm.json({ usage: "chat", spec: S.config.model, system: S.text, messages: msgs, schema: QUIZ, name: "quiz", description: "Enregistre le quiz.", maxTokens: S.config.max_tokens || 2000, trace: { name: "quiz", prompt: S.prompt, tags: ["quiz"] } });
      const qs = (data?.questions || [])
        .filter((x) => x && Array.isArray(x.options) && x.options.length >= 3 && Number.isInteger(x.bonne) && x.bonne >= 0 && x.bonne < x.options.length)
        .map((x) => ({ q: String(x.q).slice(0, 300), options: x.options.map((o) => String(o).slice(0, 160)), bonne: x.bonne, explication: String(x.explication || "").slice(0, 500) }));
      if (!qs.length) throw new Error("quiz vide");
      await insert("chats", { mode: "quiz", mesure_id: null, question: "Quiz : " + sujet, reponse: qs.map((x) => x.q).join(" | ").slice(0, 3000), v: S.version }).catch(() => {});
      return res.status(200).json({ quiz: qs, v: S.version });
    }
    let S, msgs;
    if (mode === "profil") {
      if (!(await consume(req, "profil"))) return res.status(429).json({ error: "quota" });
      const B = base(); const L = (ids) => (ids || []).slice(-60).map((id) => B.byId[id]).filter(Boolean).map((m) => `- [${B.candidats[m.P]?.cand}] ${m.t}`).join("\n");
      S = await getSystem("profil"); msgs = [{ role: "user", content: `POUR :\n${L(choix?.pour)}\n\nCONTRE :\n${L(choix?.contre)}` }];
    } else {
      msgs = cleanMsgs(req.body?.messages);
      if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "messages" });
      if (!(await consume(req, "chat"))) return res.status(429).json({ error: "quota" });
      if (mode === "mesure") {
        const m = mesure(mesureId); if (!m) return res.status(404).json({ error: "mesure" });
        let fiche = base().fiches[mesureId] || null;
        if (!fiche) { const r = await select("fiches", `id=eq.${encodeURIComponent(mesureId)}&select=data`).catch(() => []); fiche = r[0]?.data || null; }
        S = await getSystem("mesure", VARS.mesure(m, fiche));
      } else if (mode === "prof") S = await getSystem("prof", VARS.prof(sujet, retrieve(sujet + " " + msgs[msgs.length - 1].content)));
      else S = await getSystem("general", VARS.general(retrieve(msgs[msgs.length - 1].content)));
    }
    let text;
    const opts = { usage: "chat", spec: S.config.model, system: S.text, messages: msgs, maxSearches: S.config.max_searches ?? MAX_SEARCH(),
      trace: { name: "chat-" + mode, prompt: S.prompt, tags: [mode], metadata: mode === "mesure" ? { mesure: String(mesureId).slice(0, 160) } : {} } };
    if (mode === "profil") text = (await llm.text({ ...opts, maxTokens: S.config.max_tokens || 700 })).text;
    else if (req.body?.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
      const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      send({ type: "step", label: mode === "mesure" ? "Lecture de la fiche de la mesure" : mode === "prof" ? "Préparation de l'explication" : "Recherche dans la base de l'app" });
      try { text = (await llm.chat({ ...opts, maxTokens: S.config.max_tokens || 3000, onEvent: send })).text; }
      catch (e) { console.error("chat stream:", e.message); await logErr(mode, mesureId, msgs, e); send({ type: "error", error: errKind(e), detail: String(e.status || "") }); return res.end(); }
      await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: S.version }).catch(() => {});
      send({ type: "done" }); return res.end();
    }
    else text = (await llm.chat({ ...opts, maxTokens: S.config.max_tokens || 1200 })).text;
    // Journal anonyme : ni IP, ni compte, ni historique ; seulement la dernière question et la réponse.
    if (mode !== "profil") await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: S.version }).catch(() => {});
    res.status(200).json({ text, v: S.version });
  } catch (e) {
    console.error("chat:", e.message);   // visible dans Vercel > Logs
    await logErr(req.body?.mode, req.body?.mesureId, req.body?.messages, e);
    res.status(e.code === "credit" ? 503 : e.status || 500).json({ error: errKind(e), detail: hide(e.message).slice(0, 200) });
  }
}
