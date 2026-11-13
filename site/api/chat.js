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

export const config = { maxDuration: 120 };

/** Les erreurs sont aussi rangées dans le journal des chats : elles apparaissent en rouge dans /admin. */
const logErr = (mode, mesureId, msgs, e) => insert("chats", { mode: mode || "general", mesure_id: mode === "mesure" ? String(mesureId || "").slice(0, 160) : null,
  question: String(msgs?.[msgs.length - 1]?.content || "").slice(0, 1000),
  reponse: ("⚠️ ERREUR : " + String(e?.message || e)).replace(/sk-ant-[\w-]+/g, "***").slice(0, 600), v: PROMPT_VERSION }).catch(() => {});

/** Réponse avec recherche web (outil serveur d'Anthropic) ; ajoute les sources citées si le texte n'en a pas. */
async function withWeb(system, msgs) {
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: Number(process.env.CHAT_MAX_SEARCHES || 3), user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
  const conv = [...msgs]; let d, parts = [];
  for (let i = 0; i < 3; i++) {                       // la recherche peut demander plusieurs tours (pause_turn)
    d = await messages({ max_tokens: 1200, system, tools, messages: conv });
    parts.push(...(d.content || []));
    if (d.stop_reason !== "pause_turn") break;
    conv.push({ role: "assistant", content: d.content });
  }
  const texts = parts.filter((c) => c.type === "text");
  let text = texts.map((c) => c.text).join("").trim();
  const cites = [...new Map(texts.flatMap((c) => c.citations || []).filter((x) => x.url).map((x) => [x.url, x.title || new URL(x.url).hostname])).entries()].slice(0, 5);
  if (cites.length && !/\]\(https?:/.test(text)) text += "\n\nSources : " + cites.map(([u, t]) => `[${t}](${u})`).join(" · ");
  return text;
}

/** Version en direct (SSE) : on montre au navigateur les étapes (recherches web) puis le texte au fil de l'eau. */
async function streamWeb(res, system, msgs, send) {
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: Number(process.env.CHAT_MAX_SEARCHES || 3), user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
  const conv = [...msgs]; let full = ""; const cites = new Map();
  for (let turn = 0; turn < 3; turn++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL, max_tokens: 1400, system, tools, messages: conv, stream: true }) });
    if (!r.ok) { const e = new Error(`anthropic ${r.status}: ${await r.text()}`); e.status = r.status === 429 ? 429 : 502; throw e; }
    const blocks = []; let stop = null, buf = "";
    const dec = new TextDecoder();
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const raw = buf.slice(0, i); buf = buf.slice(i + 2);
        const line = raw.split("\n").find((l) => l.startsWith("data: ")); if (!line) continue;
        let ev; try { ev = JSON.parse(line.slice(6)); } catch { continue; }
        if (ev.type === "content_block_start") {
          const b = { ...ev.content_block }; blocks[ev.index] = b;
          if (b.type === "server_tool_use") b._json = "";
          if (b.type === "text") b.text = b.text || "";
          if (b.type === "web_search_tool_result") {
            const res_ = Array.isArray(b.content) ? b.content : [];
            send({ type: "results", n: res_.length, sites: [...new Set(res_.map((x) => { try { return new URL(x.url).hostname.replace(/^www\./, ""); } catch { return null; } }).filter(Boolean))].slice(0, 4) });
          }
        } else if (ev.type === "content_block_delta") {
          const b = blocks[ev.index]; if (!b) continue;
          if (ev.delta.type === "text_delta") { b.text += ev.delta.text; full += ev.delta.text; send({ type: "text", delta: ev.delta.text }); }
          else if (ev.delta.type === "input_json_delta") b._json += ev.delta.partial_json;
          else if (ev.delta.type === "citations_delta") { const ct = ev.delta.citation; (b.citations ||= []).push(ct); if (ct.url) cites.set(ct.url, ct.title || ct.url); }
        } else if (ev.type === "content_block_stop") {
          const b = blocks[ev.index];
          if (b && b.type === "server_tool_use") { try { b.input = JSON.parse(b._json || "{}"); } catch { b.input = {}; } delete b._json; send({ type: "search", query: b.input.query || "" }); }
        } else if (ev.type === "message_delta") stop = ev.delta.stop_reason;
        else if (ev.type === "error") throw new Error("anthropic stream: " + JSON.stringify(ev.error));
      }
    }
    if (stop !== "pause_turn") break;
    conv.push({ role: "assistant", content: blocks.filter(Boolean).map((b) => { const o = { ...b }; delete o._json; return o; }) });
  }
  if (cites.size && !/\]\(https?:/.test(full)) {
    const extra = "\n\nSources : " + [...cites.entries()].slice(0, 5).map(([u, t]) => `[${t}](${u})`).join(" · ");
    full += extra; send({ type: "text", delta: extra });
  }
  return full.trim();
}

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
    let text;
    if (mode === "profil") text = textOf(await messages({ max_tokens: 700, system, messages: msgs }));
    else if (req.body?.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
      const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      send({ type: "step", label: mode === "mesure" ? "Lecture de la fiche de la mesure" : "Recherche dans la base de l'app" });
      try { text = await streamWeb(res, system, msgs, send); }
      catch (e) { console.error("chat stream:", e.message); await logErr(mode, mesureId, msgs, e); send({ type: "error", error: /credit balance/i.test(e.message) ? "indisponible" : /overloaded|529/i.test(e.message) ? "surcharge" : "erreur", detail: String(e.status || "") }); return res.end(); }
      await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: PROMPT_VERSION }).catch(() => {});
      send({ type: "done" }); return res.end();
    }
    else text = await withWeb(system, msgs);
    // Journal anonyme : ni IP, ni compte, ni historique ; seulement la dernière question et la réponse.
    if (mode !== "profil") await insert("chats", { mode, mesure_id: mode === "mesure" ? String(mesureId).slice(0, 160) : null, question: msgs[msgs.length - 1].content.slice(0, 1000), reponse: text.slice(0, 3000), v: PROMPT_VERSION }).catch(() => {});
    res.status(200).json({ text, v: PROMPT_VERSION });
  } catch (e) {
    console.error("chat:", e.message);   // visible dans Vercel > Logs
    await logErr(req.body?.mode, req.body?.mesureId, req.body?.messages, e);
    const credit = /credit balance/i.test(String(e.message));
    res.status(credit ? 503 : e.status || 500).json({ error: credit ? "indisponible" : e.status === 429 ? "rate_limited" : "erreur", detail: String(e.message || "").replace(/sk-ant-[\w-]+/g, "***").slice(0, 200) });
  }
}
