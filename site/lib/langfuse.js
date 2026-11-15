// Langfuse (facultatif) : prompts + choix du modèle modifiables sans redéployer, et suivi de chaque appel IA.
// Activé seulement si LANGFUSE_PUBLIC_KEY et LANGFUSE_SECRET_KEY sont définis ; LANGFUSE_BASE_URL (défaut : région UE).
// Sans dépendance : API REST pour les prompts, OpenTelemetry (OTLP JSON) pour les traces.
// Si Langfuse ne répond pas, le site continue avec les prompts locaux (lib/prompts.js) : Langfuse ne peut jamais casser l'app.
import { randomBytes } from "node:crypto";

const BASE = () => String(process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com").replace(/\/+$/, "");
export const enabled = () => !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
const auth = () => "Basic " + Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString("base64");
const LABEL = () => process.env.LANGFUSE_PROMPT_LABEL || "production";
const TTL = () => Number(process.env.LANGFUSE_CACHE_SECONDS || 60) * 1000;

/* ---------- prompts : cache 60 s, et l'ancienne version si Langfuse est injoignable ---------- */
const cache = new Map();   // nom → { at, p }
export async function getPrompt(name) {
  if (!enabled()) return null;
  const c = cache.get(name);
  if (c && Date.now() - c.at < TTL()) return c.p;
  try {
    const r = await fetch(`${BASE()}/api/public/v2/prompts/${encodeURIComponent(name)}?label=${encodeURIComponent(LABEL())}`, { headers: { authorization: auth() }, signal: AbortSignal.timeout(1500) });
    if (!r.ok) throw new Error("langfuse " + r.status);
    const d = await r.json();
    const p = { name: d.name, version: d.version, text: typeof d.prompt === "string" ? d.prompt : "", config: d.config || {} };
    cache.set(name, { at: Date.now(), p }); return p;
  } catch (e) {
    if (c) { cache.set(name, { at: Date.now(), p: c.p }); return c.p; }       // garde la dernière version connue
    cache.set(name, { at: Date.now() - TTL() + 15000, p: null });             // réessaie dans 15 s
    console.warn("langfuse prompt", name, e.message); return null;
  }
}

/* ---------- traces (OpenTelemetry) ---------- */
const hex = (n) => randomBytes(n).toString("hex");
const ns = (ms) => String(BigInt(Math.round(ms)) * 1000000n);
const attr = (key, v) => v == null ? null : { key, value: Array.isArray(v) ? { arrayValue: { values: v.map((x) => ({ stringValue: String(x) })) } }
  : typeof v === "number" ? (Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v }) : { stringValue: typeof v === "string" ? v : JSON.stringify(v) } };

/**
 * Enregistre un appel IA (une trace = une génération). Attendre la promesse avant de répondre : sur Vercel, la fonction s'arrête juste après.
 * g = { name, model, provider, input, output, usage, cost, prompt: {name, version}, start, end, error, metadata, tags }
 */
export async function traceGeneration(g) {
  if (!enabled()) return;
  const meta = Object.entries(g.metadata || {}).map(([k, v]) => attr("langfuse.observation.metadata." + k, v));
  const u = g.usage || {};
  const span = {
    traceId: hex(16), spanId: hex(8), name: g.name || "llm", kind: 1,
    startTimeUnixNano: ns(g.start || Date.now()), endTimeUnixNano: ns(g.end || Date.now()),
    status: g.error ? { code: 2, message: String(g.error).slice(0, 500) } : { code: 1 },
    attributes: [
      attr("langfuse.trace.name", g.name), attr("langfuse.trace.tags", g.tags || []),
      attr("langfuse.observation.type", "generation"),
      attr("langfuse.observation.model.name", g.model),
      attr("langfuse.observation.input", g.input), attr("langfuse.observation.output", g.output),
      attr("langfuse.observation.usage_details", { input: Math.max(0, (u.in || 0) - (u.cacheRead || 0)), output: u.out || 0, cache_read_input_tokens: u.cacheRead || 0, cache_creation_input_tokens: u.cacheWrite || 0, web_search_requests: u.searches || 0 }),
      g.cost != null ? attr("langfuse.observation.cost_details", { total: g.cost }) : null,
      g.prompt?.name ? attr("langfuse.observation.prompt.name", g.prompt.name) : null,
      g.prompt?.version ? attr("langfuse.observation.prompt.version", g.prompt.version) : null,
      g.error ? attr("langfuse.observation.level", "ERROR") : null,
      g.error ? attr("langfuse.observation.status_message", String(g.error).slice(0, 500)) : null,
      attr("langfuse.observation.metadata.provider", g.provider), ...meta
    ].filter(Boolean)
  };
  const body = { resourceSpans: [{ resource: { attributes: [attr("service.name", "swipe2027")] }, scopeSpans: [{ scope: { name: "swipe2027-llm" }, spans: [span] }] }] };
  try {
    const r = await fetch(`${BASE()}/api/public/otel/v1/traces`, { method: "POST", headers: { authorization: auth(), "content-type": "application/json", "x-langfuse-ingestion-version": "4" }, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) });
    if (!r.ok) console.warn("langfuse trace", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.warn("langfuse trace", e.message); }
}

/* ---------- création des prompts (utilisé par scripts/langfuse-sync.mjs) ---------- */
export async function listPromptNames() {
  const r = await fetch(`${BASE()}/api/public/v2/prompts?limit=100`, { headers: { authorization: auth() } });
  if (!r.ok) throw new Error(`Langfuse ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return new Set(((await r.json()).data || []).map((p) => p.name));
}
export async function createPrompt({ name, prompt, config, commitMessage }) {
  const r = await fetch(`${BASE()}/api/public/v2/prompts`, { method: "POST", headers: { authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify({ name, type: "text", prompt, config, labels: [LABEL()], commitMessage }) });
  if (!r.ok) throw new Error(`Langfuse ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
