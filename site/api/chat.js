// POST /api/chat  { mode: "general" | "mesure" | "profil", mesureId?, messages?: [{role,content}], choix?: {pour:[ids], contre:[ids]} }
// Le navigateur n'envoie JAMAIS de prompt système : il est construit ici.
import { build, VARS, withUser, PROMPT_VERSION } from "../lib/prompts.js";
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
const ITEMS = { type: "array", items: { type: "object", required: ["theme", "texte"], properties: { theme: { type: "string" }, texte: { type: "string" } } } };
const PORTRAIT = { type: "object", required: ["en_un_mot", "approuves", "rejettes", "ressort", "candidats_proches"], properties: {
  en_un_mot: { type: "string" }, approuves: ITEMS, rejettes: ITEMS, ressort: { type: "array", items: { type: "string" } },
  candidats_proches: { type: "array", items: { type: "object", required: ["candidat", "pourquoi"], properties: { candidat: { type: "string" }, pourquoi: { type: "string" } } } } } };
const errKind = (e) => e.code === "credit" ? "indisponible" : e.code === "overloaded" ? "surcharge" : e.status === 429 ? "rate_limited" : "erreur";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { mode = "general", mesureId, choix } = req.body || {};
  const sujet = String(req.body?.sujet || "la politique française").replace(/[<>`]/g, "").slice(0, 80);
  try {
    if (mode === "quiz") {                          // quiz QCM structuré, sans recherche web (rapide)
      const msgs = cleanMsgs(req.body?.messages); if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "messages" });
      if (!(await consume(req, "chat"))) return res.status(429).json({ error: "quota" });
      const S = await build("quiz", VARS.quiz(sujet, msgs[msgs.length - 1].content));
      const { data } = await llm.json({ usage: "chat", spec: S.config.model, system: S.system, messages: withUser(msgs, S.user), schema: QUIZ, name: "quiz", description: "Enregistre le quiz.", maxTokens: S.config.max_tokens || 2000, trace: { name: "quiz", prompt: S.prompt, tags: ["quiz"] } });
      const qs = (data?.questions || [])
        .filter((x) => x && Array.isArray(x.options) && x.options.length >= 3 && Number.isInteger(x.bonne) && x.bonne >= 0 && x.bonne < x.options.length)
        .map((x) => ({ q: String(x.q).slice(0, 300), options: x.options.map((o) => String(o).slice(0, 160)), bonne: x.bonne, explication: String(x.explication || "").slice(0, 500) }));
      if (!qs.length) throw new Error("quiz vide");
      await insert("chats", { mode: "quiz", mesure_id: null, question: "Quiz : " + sujet, reponse: qs.map((x) => x.q).join(" | ").slice(0, 3000), v: S.version }).catch(() => {});
      return res.status(200).json({ quiz: qs, v: S.version });
    }
    if (mode === "profil") {                        // portrait structuré : chiffres calculés ici (exacts), texte rédigé par l'IA
      if (!(await consume(req, "profil"))) return res.status(429).json({ error: "quota" });
      const B = base(), ok = (id) => B.byId[id] && !/ne se présente plus/.test(B.candidats[B.byId[id].P]?.cand || "");
      const pour = (choix?.pour || []).filter(ok), contre = (choix?.contre || []).filter(ok);
      const nomOf = (P) => (B.candidats[P]?.cand || P);
      const L = (ids) => ids.slice(-80).map((id) => B.byId[id]).map((m) => `- [${nomOf(m.P)}] ${m.t} (thème : ${m.section})`).join("\n") || "(aucune)";
      const st = {}, th = {};
      for (const [ids, k] of [[pour, "a"], [contre, "b"]]) for (const id of ids) { const m = B.byId[id];
        (st[m.P] ||= { P: m.P, cand: nomOf(m.P), nom: B.candidats[m.P]?.nom || m.P, a: 0, b: 0 })[k]++; (th[m.section] ||= { a: 0, b: 0 })[k]++; }
      const C = Object.values(st).map((x) => ({ ...x, t: x.a + x.b, p: Math.round(100 * x.a / (x.a + x.b)) })).sort((x, y) => y.p - x.p || y.t - x.t);
      const fiables = C.filter((x) => x.t >= 3), proches = (fiables.length ? fiables : C).slice(0, 3);
      const stats = C.map((x) => `- ${x.cand} (${x.nom}) : ${x.a} pour, ${x.b} contre → ${x.p} % d'accord${x.t < 3 ? " (peu de réponses)" : ""}`).join("\n");
      const themes = Object.entries(th).sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b)).slice(0, 15).map(([s, v]) => `- ${s} : ${v.a} pour, ${v.b} contre`).join("\n");
      const S = await build("profil", VARS.profil(L(pour), L(contre), stats, themes, proches.map((x) => `${x.cand} (${x.p} %)`).join(", ")));
      const { data } = await llm.json({ usage: "chat", spec: S.config.model, reasoning: S.config.reasoning || "low", system: S.system, messages: [{ role: "user", content: S.user }],
        schema: PORTRAIT, name: "portrait", description: "Enregistre le portrait.", maxTokens: Math.max(S.config.max_tokens || 0, 1500), trace: { name: "profil", prompt: S.prompt, tags: ["profil"] } });
      const cut = (s, n) => String(s || "").slice(0, n), list = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);
      const why = Object.fromEntries(list(data?.candidats_proches, 5).map((x) => [String(x.candidat || "").toLowerCase(), cut(x.pourquoi, 300)]));
      const portrait = {
        en_un_mot: cut(data?.en_un_mot, 300),
        approuves: list(data?.approuves, 5).map((x) => ({ theme: cut(x.theme, 60), texte: cut(x.texte, 400) })),
        rejettes: list(data?.rejettes, 5).map((x) => ({ theme: cut(x.theme, 60), texte: cut(x.texte, 400) })),
        ressort: list(data?.ressort, 4).map((x) => cut(x, 400)),
        proches: proches.map((x) => ({ P: x.P, cand: x.cand, nom: x.nom, a: x.a, b: x.b, p: x.p,
          pourquoi: why[x.cand.toLowerCase()] || Object.entries(why).find(([k]) => k.includes(x.cand.split(" ").pop().toLowerCase()))?.[1] || "" }))
      };
      if (!portrait.en_un_mot && !portrait.approuves.length) throw new Error("portrait vide");
      return res.status(200).json({ portrait, n: pour.length + contre.length, v: S.version });
    }
    let S, msgs;
    {
      msgs = cleanMsgs(req.body?.messages);
      if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "messages" });
      if (!(await consume(req, "chat"))) return res.status(429).json({ error: "quota" });
      const last = () => msgs[msgs.length - 1].content;
      if (mode === "mesure") {
        const m = mesure(mesureId); if (!m) return res.status(404).json({ error: "mesure" });
        let fiche = base().fiches[mesureId] || null;
        if (!fiche) { const r = await select("fiches", `id=eq.${encodeURIComponent(mesureId)}&select=data`).catch(() => []); fiche = r[0]?.data || null; }
        S = await build("mesure", VARS.mesure(m, fiche, last()));
      } else if (mode === "prof") S = await build("prof", VARS.prof(sujet, retrieve(sujet + " " + last()), last()));
      else S = await build("general", VARS.general(retrieve(last()), last()));
    }
    let text;
    const opts = { usage: "chat", spec: S.config.model, reasoning: S.config.reasoning || (mode === "profil" ? "low" : undefined), system: S.system, messages: mode === "profil" ? msgs : withUser(msgs, S.user), maxSearches: S.config.max_searches ?? MAX_SEARCH(),
      trace: { name: "chat-" + mode, prompt: S.prompt, tags: [mode], metadata: mode === "mesure" ? { mesure: String(mesureId).slice(0, 160) } : {} } };
    if (mode === "profil" && !req.body?.stream) text = (await llm.text({ ...opts, maxTokens: Math.max(S.config.max_tokens || 0, 1500) })).text;
    else if (req.body?.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
      const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      send({ type: "step", label: mode === "profil" ? "Lecture de tes réponses" : mode === "mesure" ? "Lecture de la fiche de la mesure" : mode === "prof" ? "Préparation de l'explication" : "Recherche dans la base de l'app" });
      try { text = (await llm.chat({ ...opts, ...(mode === "profil" ? { web: false } : {}), maxTokens: mode === "profil" ? Math.max(S.config.max_tokens || 0, 1500) : S.config.max_tokens || 3000, onEvent: send })).text; }
      catch (e) { console.error("chat stream:", e.message); await logErr(mode, mesureId, msgs, e); send({ type: "error", error: errKind(e), detail: String(e.status || "") }); return res.end(); }
      if (mode !== "profil") await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: S.version }).catch(() => {});
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
