// Couche IA indépendante du fournisseur : Anthropic (Claude), OpenAI (GPT) et Google (Gemini), sans dépendance.
//
// Choix du modèle : variables d'environnement au format « fournisseur:modèle »
//   LLM_CHAT    chat, quiz, lecture du profil      ex. openai:gpt-6-luna
//   LLM_FICHE   fiches générées (recherche web)    ex. anthropic:claude-sonnet-5-5
//   LLM_DEFAULT utilisé si l'une des deux manque ;  à défaut : anthropic:$ANTHROPIC_MODEL (ancien réglage)
// Clés : ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY (seulement celles des fournisseurs utilisés).
// Option OpenAI : OPENAI_REASONING_EFFORT (none | low | medium | high), par défaut celui du modèle.
//
// Trois fonctions, mêmes entrées quel que soit le fournisseur :
//   text({ usage, system, messages, maxTokens })                        → { text, usage }
//   json({ usage, system, messages, schema, name, web, maxTokens })     → { data, usage }   (web = { maxSearches } ou false)
//   chat({ usage, system, messages, maxSearches, maxTokens, onEvent })  → { text, usage }   (recherche web + flux en direct)
// onEvent reçoit { type: "search", query } | { type: "fetch", url } | { type: "results", n, sites } | { type: "text", delta }.
// Les erreurs portent e.status (429, 502, 503) et e.code : "credit" (crédit épuisé), "rate", "overloaded", "http", "config".

import { traceGeneration } from "./langfuse.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const err = (msg, status = 502, code = "http") => Object.assign(new Error(msg), { status, code });
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const LOC = { country: "FR", timezone: "Europe/Paris" };

/* ---------- configuration ---------- */
export function parseSpec(spec) {
  const s = String(spec || "").trim(); const i = s.indexOf(":");
  let provider, model;
  if (i > 0) { provider = s.slice(0, i).toLowerCase(); model = s.slice(i + 1).trim(); }
  else { model = s; provider = /^(gpt|o\d)/i.test(s) ? "openai" : /^gemini/i.test(s) ? "gemini" : "anthropic"; }
  if (!P[provider]) throw err(`fournisseur IA inconnu : « ${provider} » (anthropic, openai ou gemini)`, 500, "config");
  if (!model) throw err("aucun modèle IA configuré : mets LLM_CHAT / LLM_FICHE (ex. anthropic:claude-sonnet-5-5)", 500, "config");
  return { provider, model };
}
export function pick(usage = "default") {
  const env = process.env;
  const spec = env["LLM_" + String(usage).toUpperCase()] || env.LLM_DEFAULT || (env.ANTHROPIC_MODEL ? "anthropic:" + env.ANTHROPIC_MODEL : "");
  return parseSpec(spec);
}
const KEYS = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", gemini: "GEMINI_API_KEY" };
function keyOf(provider) { const k = process.env[KEYS[provider]]; if (!k) throw err(`clé manquante : ${KEYS[provider]}`, 500, "config"); return k; }
const resolve = (o) => (o.provider && o.model ? { provider: o.provider, model: o.model } : o.spec ? parseSpec(o.spec) : pick(o.usage));
// Ordre de priorité du modèle : config du prompt Langfuse (spec) > LLM_CHAT / LLM_FICHE > LLM_DEFAULT > ANTHROPIC_MODEL.

/* ---------- HTTP commun ---------- */
async function post(url, headers, body, retries = 0, tries = 0) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (r.ok) return r;
  const txt = await r.text();
  if (/credit balance|insufficient_quota|billing|exceeded your current quota|prepayment credits/i.test(txt)) throw err("crédit IA épuisé : " + txt.slice(0, 200), 503, "credit");
  if ((r.status === 429 || r.status === 529 || r.status >= 500) && tries < retries) {
    await sleep(Number(r.headers.get("retry-after")) * 1000 || Math.min(60000, 5000 * 2 ** tries));
    return post(url, headers, body, retries, tries + 1);
  }
  throw err(`${r.status}: ${txt.slice(0, 500)}`, r.status === 429 ? 429 : r.status === 400 ? 400 : 502,
    r.status === 429 ? "rate" : r.status === 529 || /overloaded/i.test(txt) ? "overloaded" : "http");
}
async function* sse(r) {
  const dec = new TextDecoder(); let buf = "";
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const raw = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!data || data === "[DONE]") continue;
      try { yield JSON.parse(data); } catch { /* ligne incomplète ou non JSON */ }
    }
  }
}
const parseJSON = (t) => {
  const s = String(t || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(s); } catch { const a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1)); throw err("réponse JSON illisible", 502, "http"); }
};
const JSON_ONLY = "\n\nFORMAT DE SORTIE (prioritaire sur toute consigne d'outil ci-dessus) : ta réponse finale est UNIQUEMENT l'objet JSON demandé, sans texte avant ni après.";
// usage normalisé : in = tous les tokens d'entrée (cache compris), cacheRead / cacheWrite = dont lus / écrits en cache
const usage0 = () => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, searches: 0 });
const sourcesLine = (cites) => "\n\nSources : " + [...cites.entries()].slice(0, 5).map(([u, t]) => `[${t}](${u})`).join(" · ");

/* =====================================================================
   ANTHROPIC (Claude) — API Messages ; recherche web = outil serveur (max_uses)
   ===================================================================== */
const A = {
  url: "https://api.anthropic.com/v1/messages",
  h: (beta) => ({ "x-api-key": keyOf("anthropic"), "anthropic-version": "2023-06-01", ...(beta ? { "anthropic-beta": beta } : {}) }),
  addUsage(u, d) { const x = d?.usage || {}; u.in += (x.input_tokens || 0) + (x.cache_read_input_tokens || 0) + (x.cache_creation_input_tokens || 0); u.out += x.output_tokens || 0; u.cacheRead += x.cache_read_input_tokens || 0; u.cacheWrite += x.cache_creation_input_tokens || 0; u.searches += x.server_tool_use?.web_search_requests || 0; },
  search: (n) => ({ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", ...LOC } }),
  fetchOk: process.env.CHAT_WEB_FETCH !== "0",

  async text({ model, system, messages, maxTokens = 1000, retries }) {
    const u = usage0(); const d = await (await post(A.url, A.h(), { model, max_tokens: maxTokens, system, messages }, retries)).json(); A.addUsage(u, d);
    return { text: (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim(), usage: u };
  },

  async json({ model, system, messages, schema, name = "resultat", description = "Enregistre le résultat final.", web, maxTokens = 4000, retries }) {
    const u = usage0();
    const tool = { name, description, input_schema: schema, cache_control: { type: "ephemeral" } };
    const sys = [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];   // cache : ~10 % du prix à partir du 2e appel
    if (!web) {
      const d = await (await post(A.url, A.h(), { model, max_tokens: maxTokens, system: sys, messages, tools: [tool], tool_choice: { type: "tool", name } }, retries)).json(); A.addUsage(u, d);
      const c = (d.content || []).find((b) => b.type === "tool_use"); if (!c) throw err("pas de résultat structuré"); return { data: c.input, usage: u };
    }
    const tools = [A.search(web.maxSearches || 3), tool], conv = [...messages];
    for (let i = 0; i < 6; i++) {                      // la recherche peut demander plusieurs tours (pause_turn)
      const d = await (await post(A.url, A.h(), { model, max_tokens: maxTokens, system: sys, tools, messages: conv }, retries)).json(); A.addUsage(u, d);
      const c = (d.content || []).find((b) => b.type === "tool_use" && b.name === name);
      if (c) return { data: c.input, usage: u };
      conv.push({ role: "assistant", content: d.content });
      if (d.stop_reason !== "pause_turn") conv.push({ role: "user", content: `Appelle maintenant l'outil ${name} avec le résultat complet.` });
    }
    throw err("pas de résultat structuré");
  },

  async chat({ model, system, messages, maxSearches = 10, maxTokens = 3000, onEvent = () => {}, retries, web }) {
    const u = usage0(), conv = [...messages], cites = new Map(); let full = "";
    for (let turn = 0; turn < 8; turn++) {
      const tools = web === false ? [] : [A.search(maxSearches), ...(A.fetchOk ? [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: Number(process.env.CHAT_MAX_FETCHES || 3), max_content_tokens: 12000 }] : [])];
      let r;
      try { r = await post(A.url, A.h(A.fetchOk && web !== false ? "web-fetch-2025-09-10" : ""), { model, max_tokens: maxTokens, system, ...(tools.length ? { tools } : {}), messages: conv, stream: true }, retries); }
      catch (e) { if (e.status === 400 && A.fetchOk && /fetch|beta|tool/i.test(e.message)) { A.fetchOk = false; turn--; continue; } throw e; }
      const blocks = []; let stop = null;
      for await (const ev of sse(r)) {
        if (ev.type === "message_start") A.addUsage(u, ev.message);
        else if (ev.type === "content_block_start") {
          const b = { ...ev.content_block }; blocks[ev.index] = b;
          if (b.type === "server_tool_use") b._json = "";
          if (b.type === "text") b.text = b.text || "";
          if (b.type === "web_search_tool_result") { const L = Array.isArray(b.content) ? b.content : []; onEvent({ type: "results", n: L.length, sites: [...new Set(L.map((x) => host(x.url)).filter(Boolean))].slice(0, 4) }); }
        } else if (ev.type === "content_block_delta") {
          const b = blocks[ev.index]; if (!b) continue;
          if (ev.delta.type === "text_delta") { b.text += ev.delta.text; full += ev.delta.text; onEvent({ type: "text", delta: ev.delta.text }); }
          else if (ev.delta.type === "input_json_delta") b._json += ev.delta.partial_json;
          else if (ev.delta.type === "citations_delta") { const ct = ev.delta.citation; (b.citations ||= []).push(ct); if (ct.url) cites.set(ct.url, ct.title || host(ct.url)); }
        } else if (ev.type === "content_block_stop") {
          const b = blocks[ev.index];
          if (b && b.type === "server_tool_use") { try { b.input = JSON.parse(b._json || "{}"); } catch { b.input = {}; } delete b._json; onEvent(b.name === "web_fetch" ? { type: "fetch", url: b.input.url || "" } : { type: "search", query: b.input.query || "" }); }
        } else if (ev.type === "message_delta") { stop = ev.delta.stop_reason; A.addUsage(u, { usage: { output_tokens: ev.usage?.output_tokens, server_tool_use: ev.usage?.server_tool_use } }); }
        else if (ev.type === "error") throw err("flux interrompu : " + JSON.stringify(ev.error), 502, /overloaded/i.test(JSON.stringify(ev.error)) ? "overloaded" : "http");
      }
      if (stop !== "pause_turn") break;
      conv.push({ role: "assistant", content: blocks.filter(Boolean).map((b) => { const o = { ...b }; delete o._json; return o; }) });
    }
    return { text: full, cites, usage: u };
  }
};

/* =====================================================================
   OPENAI (GPT) — API Responses ; recherche web = outil web_search, plafonné par max_tool_calls
   ===================================================================== */
const O = {
  url: "https://api.openai.com/v1/responses",
  h: () => ({ authorization: "Bearer " + keyOf("openai") }),
  base({ model, system, messages, maxTokens }) {
    const b = { model, instructions: system, input: messages.map((m) => ({ role: m.role, content: m.content })), max_output_tokens: Math.max(maxTokens * 3, maxTokens + 2000) };   // la réflexion interne du modèle compte dans ce plafond
    if (process.env.OPENAI_REASONING_EFFORT) b.reasoning = { effort: process.env.OPENAI_REASONING_EFFORT };
    return b;
  },
  web: (n) => ({ tools: [{ type: "web_search", user_location: { type: "approximate", ...LOC } }], max_tool_calls: n }),
  addUsage(u, d) { const x = d?.usage || {}; u.in += x.input_tokens || 0; u.out += x.output_tokens || 0; u.cacheRead += x.input_tokens_details?.cached_tokens || 0; u.searches += (d?.output || []).filter((o) => o.type === "web_search_call").length; },
  outText: (d) => (d.output || []).filter((o) => o.type === "message").flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("").trim(),
  check(d) { if (d.status === "incomplete") throw err("réponse tronquée (" + (d.incomplete_details?.reason || "?") + ")"); },

  async text(o) { const u = usage0(); const d = await (await post(O.url, O.h(), O.base({ maxTokens: 1000, ...o }), o.retries)).json(); O.check(d); O.addUsage(u, d); return { text: O.outText(d), usage: u }; },

  async json(o) {
    const u = usage0(), { schema, name = "resultat", web } = o;
    const body = { ...O.base({ maxTokens: 4000, ...o, system: o.system + JSON_ONLY }), text: { format: { type: "json_schema", name, schema, strict: false } }, ...(web ? O.web(web.maxSearches || 3) : {}) };
    const d = await (await post(O.url, O.h(), body, o.retries)).json(); O.check(d); O.addUsage(u, d);
    return { data: parseJSON(O.outText(d)), usage: u };
  },

  async chat({ maxSearches = 10, onEvent = () => {}, retries, ...o }) {
    const u = usage0(), cites = new Map(); let full = "";
    const body = { ...O.base({ maxTokens: 3000, ...o }), ...(o.web === false ? {} : O.web(maxSearches)) };
    let r;
    if (!O.noStream) {
      try { r = await post(O.url, O.h(), { ...body, stream: true }, retries); }
      catch (e) { if (e.status === 400 && /verif/i.test(e.message)) O.noStream = true; else throw e; }   // organisation OpenAI non vérifiée : pas de flux
    }
    if (O.noStream) {                                  // repli sans flux : même réponse, envoyée d'un bloc
      const d = await (await post(O.url, O.h(), body, retries)).json(); O.check(d); O.addUsage(u, d);
      for (const it of d.output || []) {
        if (it.type === "web_search_call") { const a = it.action || {}; if (a.type === "open_page") onEvent({ type: "fetch", url: a.url || "" }); else onEvent({ type: "search", query: a.query || "" }); }
        if (it.type === "message") for (const c of it.content || []) if (c.type === "output_text") { full += c.text; for (const an of c.annotations || []) if (an.url) cites.set(an.url, an.title || host(an.url)); }
      }
      if (full) onEvent({ type: "text", delta: full });
      return { text: full, cites, usage: u };
    }
    for await (const ev of sse(r)) {
      if (ev.type === "response.output_text.delta") { full += ev.delta; onEvent({ type: "text", delta: ev.delta }); }
      else if (ev.type === "response.output_item.done" && ev.item?.type === "web_search_call") {
        const a = ev.item.action || {};
        if (a.type === "open_page") onEvent({ type: "fetch", url: a.url || "" });
        else if (a.type === "search" || a.query) { onEvent({ type: "search", query: a.query || "" }); if (a.sources?.length) onEvent({ type: "results", n: a.sources.length, sites: [...new Set(a.sources.map((s) => host(s.url)).filter(Boolean))].slice(0, 4) }); }
      }
      else if (ev.type === "response.output_text.annotation.added" && ev.annotation?.url) cites.set(ev.annotation.url, ev.annotation.title || host(ev.annotation.url));
      else if (ev.type === "response.completed" || ev.type === "response.incomplete") O.addUsage(u, ev.response);
      else if (ev.type === "response.failed" || ev.type === "error") throw err("flux interrompu : " + JSON.stringify(ev.response?.error || ev.error || ev).slice(0, 300));
    }
    return { text: full, cites, usage: u };
  }
};

/* =====================================================================
   GOOGLE (Gemini) — API generateContent ; recherche web = Grounding with Google Search (pas de plafond par requête)
   ===================================================================== */
const G = {
  url: (model, stream) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`,
  h: () => ({ "x-goog-api-key": keyOf("gemini") }),
  base: ({ system, messages, maxTokens }) => ({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: Math.max(2048, maxTokens * 3) }          // marge pour la réflexion interne du modèle
  }),
  parts: (d) => (d?.candidates?.[0]?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join(""),
  addUsage(u, d) { const x = d?.usageMetadata || {}; u.in += x.promptTokenCount || 0; u.out += (x.candidatesTokenCount || 0) + (x.thoughtsTokenCount || 0); u.cacheRead += x.cachedContentTokenCount || 0; u.searches += d?.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0; },

  async text(o) { const u = usage0(); const d = await (await post(G.url(o.model), G.h(), G.base({ maxTokens: 1000, ...o }), o.retries)).json(); G.addUsage(u, d); return { text: G.parts(d).trim(), usage: u }; },

  async json(o) {
    const u = usage0(), web = !!o.web;
    const body = G.base({ maxTokens: 4000, ...o, system: o.system + JSON_ONLY });
    if (web) body.tools = [{ google_search: {} }];
    body.generationConfig = { ...body.generationConfig, responseMimeType: "application/json", responseJsonSchema: o.schema };
    let d;
    try { d = await (await post(G.url(o.model), G.h(), body, o.retries)).json(); }
    catch (e) {                                       // anciens modèles : pas de JSON imposé avec la recherche → schéma dans la consigne
      if (!(e.status === 400 && web)) throw e;
      delete body.generationConfig.responseMimeType; delete body.generationConfig.responseJsonSchema;
      body.systemInstruction.parts[0].text += "\n\nSchéma JSON à respecter :\n" + JSON.stringify(o.schema);
      d = await (await post(G.url(o.model), G.h(), body, o.retries)).json();
    }
    G.addUsage(u, d);
    return { data: parseJSON(G.parts(d)), usage: u };
  },

  async chat({ onEvent = () => {}, retries, ...o }) {
    const u = usage0(), cites = new Map(), seen = new Set(); let full = "", last = null;
    const r = await post(G.url(o.model, true), G.h(), { ...G.base({ maxTokens: 3000, ...o }), ...(o.web === false ? {} : { tools: [{ google_search: {} }] }) }, retries);
    for await (const ev of sse(r)) {
      if (ev.error) throw err("flux interrompu : " + JSON.stringify(ev.error).slice(0, 300));
      const gm = ev.candidates?.[0]?.groundingMetadata;
      for (const q of gm?.webSearchQueries || []) if (!seen.has(q)) { seen.add(q); onEvent({ type: "search", query: q }); }
      if (gm?.groundingChunks?.length) { const W = gm.groundingChunks.map((c) => c.web).filter(Boolean); W.forEach((w) => cites.set(w.uri, w.title || host(w.uri))); onEvent({ type: "results", n: W.length, sites: [...new Set(W.map((w) => w.title))].slice(0, 4) }); }
      const t = G.parts(ev); if (t) { full += t; onEvent({ type: "text", delta: t }); }
      last = ev;
    }
    if (last) { const x = last.usageMetadata || {}; u.in += x.promptTokenCount || 0; u.out += (x.candidatesTokenCount || 0) + (x.thoughtsTokenCount || 0); u.searches += seen.size; }
    return { text: full, cites, usage: u };
  }
};

const P = { anthropic: A, openai: O, gemini: G };

/* ---------- interface publique ----------
   Options communes : spec ("openai:gpt-6-luna", prioritaire, ex. venant de la config Langfuse) ou usage ("chat" / "fiche"),
   trace : { name, prompt: {name, version}, metadata, tags } pour le suivi Langfuse (ignoré si Langfuse n'est pas configuré). */
async function traced(kind, o, run) {
  const m = resolve(o), start = Date.now();
  const base = { name: o.trace?.name || kind, model: m.model, provider: m.provider, prompt: o.trace?.prompt, tags: o.trace?.tags, metadata: o.trace?.metadata,
    input: { system: String(o.system || "").slice(0, 8000), messages: (o.messages || []).slice(-6) } };
  try {
    const r = await run(m);
    await traceGeneration({ ...base, output: r.text ?? r.data, usage: r.usage, cost: cost(m.model, r.usage), start, end: Date.now() });
    return { ...r, ...m };
  } catch (e) { await traceGeneration({ ...base, error: e.message, start, end: Date.now() }); throw e; }
}
export const text = (o) => traced("text", o, (m) => P[m.provider].text({ ...o, ...m }));
export const json = (o) => traced("json", o, (m) => P[m.provider].json({ ...o, ...m }));
/** Chat avec recherche web, en flux. Ajoute « Sources : … » à la fin si le texte n'a aucun lien. */
export const chat = (o) => traced("chat", o, async (m) => {
  const onEvent = o.onEvent || (() => {});
  const res = await P[m.provider].chat({ ...o, ...m, onEvent });
  let t = res.text;
  if (res.cites.size && !/\]\(https?:/.test(t)) { const extra = sourcesLine(res.cites); t += extra; onEvent({ type: "text", delta: extra }); }
  return { text: t.trim(), usage: res.usage };
});

/** Prix indicatifs ($ par million de tokens entrée / sortie, $ par recherche web) pour les estimations du script. Vérifie sur le site du fournisseur. */
export const PRICES = {
  "claude-sonnet-5-5": [2, 10, 0.01],
  "gpt-6-luna": [0.1, 0.5, 0.01], "gpt-6-sol": [2, 10, 0.01], "gpt-6-astra": [10, 50, 0.01],
  "gemini-3.8-flash": [0.75, 3.75, 0.014], "gemini-3.1-flash-lite": [0.25, 1.5, 0.014]
};
export function cost(model, u) {
  const p = PRICES[model]; if (!p) return null;
  const inp = u.in - u.cacheRead - u.cacheWrite;   // « in » = total des tokens d'entrée, cache compris
  return (Math.max(0, inp) + u.cacheRead * 0.1 + u.cacheWrite * 1.25) / 1e6 * p[0] + u.out / 1e6 * p[1] + u.searches * p[2];
}
