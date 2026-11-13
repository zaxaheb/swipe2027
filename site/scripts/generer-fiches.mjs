// Génère des fiches sourcées en lot avec l'API Anthropic (recherche web), en parallèle.
// Usage (depuis le dossier site/) :
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generer-fiches.mjs --n 100
// Options : --n (nombre de fiches, défaut 100), --parallel (défaut 4), --recherches (par fiche, défaut 3), --model (défaut claude-sonnet-5-5), --ids id1,id2
// Les fiches sont ajoutées au fur et à mesure dans ../data/fiches_auto.json (on peut relancer : les fiches déjà faites sont sautées).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SYSTEM, ficheUser, PROMPT_VERSION } from "../lib/prompts.js";
import { FICHE, cleanFiche } from "../lib/schemas.js";
import { base, mesure } from "../lib/data.js";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg("n", 100)), PAR = Number(arg("parallel", 4)), SEARCHES = Number(arg("recherches", 3)), MODEL = arg("model", process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("Il manque la clé : ANTHROPIC_API_KEY=sk-ant-... node scripts/generer-fiches.mjs"); process.exit(1); }

const OUT = "../data/fiches_auto.json";
const manual = JSON.parse(readFileSync("../data/fiches.json", "utf8"));
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const save = () => writeFileSync(OUT, JSON.stringify(done, null, 1));

// Sélection : mesures clés d'abord, en alternant les candidats ; puis les autres.
const B = base();
const cle = new Set(JSON.parse(readFileSync("scripts/mesures-cles.json", "utf8")));
let todo;
if (arg("ids")) todo = arg("ids").split(",");
else {
  const libre = B.mesures.filter((m) => !manual[m.id] && !done[m.id]);
  const parCand = {};
  for (const m of libre) (parCand[m.P] ||= { k: [], r: [] })[cle.has(m.id) ? "k" : "r"].push(m.id);
  const rr = (key) => { const L = Object.values(parCand).map((x) => x[key]), o = []; for (let i = 0; o.length < 5000 && L.some((x) => x[i]); i++) for (const x of L) if (x[i]) o.push(x[i]); return o; };
  todo = [...rr("k"), ...rr("r")].slice(0, N);
}
console.log(`${todo.length} fiches à générer avec ${MODEL}, ${PAR} en parallèle. Résultats : data/fiches_auto.json`);

let STOP = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(body, tries = 0) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, ...body }) });
  if ((r.status === 429 || r.status === 529 || r.status >= 500) && tries < 8) {
    const wait = Number(r.headers.get("retry-after")) * 1000 || Math.min(60000, 5000 * 2 ** tries);
    process.stdout.write(`  … limite de débit (${r.status}), pause ${Math.round(wait / 1000)} s\n`); await sleep(wait); return call(body, tries + 1);
  }
  if (!r.ok) {
    const txt = await r.text();
    if (/credit balance|billing|insufficient/i.test(txt)) { STOP = true; throw new Error("CRÉDIT ÉPUISÉ : recharge sur console.anthropic.com › Billing, puis relance (les fiches déjà faites sont gardées)."); }
    throw new Error(`API ${r.status}: ${txt.slice(0, 300)}`);
  }
  return r.json();
}

let ok = 0, ko = 0, cost = { in: 0, out: 0, search: 0 };
async function one(id) {
  const m = mesure(id); if (!m) return;
  const autres = B.mesures.filter((x) => x.P === m.P && x.id !== id && (m.P !== "LFI" || x.section === m.section || x._n.split(" ").some((w) => w.length > 6 && m._n?.includes(w)))).slice(0, 120);
  // Cache du prompt : le système et les outils (identiques pour toutes les fiches) sont facturés ~10 % du prix après le 1er appel.
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: SEARCHES }, { name: "enregistrer_fiche", description: "Enregistre la fiche sourcée finale. À appeler une seule fois, à la fin.", input_schema: FICHE, cache_control: { type: "ephemeral" } }];
  const system = [{ type: "text", text: SYSTEM.fiche + `\n\nBudget : ${SEARCHES} recherches web maximum. Choisis des requêtes précises et lis les résultats les plus utiles.`, cache_control: { type: "ephemeral" } }];
  const msgs = [{ role: "user", content: ficheUser(m, autres) }];
  for (let attempt = 0; attempt < 2; attempt++) {
    let d, call_;
    for (let i = 0; i < 4 && !call_; i++) {
      d = await call({ max_tokens: 5000, system, tools, messages: msgs });
      cost.in += (d.usage?.input_tokens || 0) + (d.usage?.cache_creation_input_tokens || 0) * 1.25 + (d.usage?.cache_read_input_tokens || 0) * 0.1; cost.out += d.usage?.output_tokens || 0; cost.search += d.usage?.server_tool_use?.web_search_requests || 0;
      call_ = (d.content || []).find((c) => c.type === "tool_use" && c.name === "enregistrer_fiche");
      if (call_ || d.stop_reason !== "pause_turn") break;
      msgs.push({ role: "assistant", content: d.content });
    }
    if (call_) {
      try {
        const f = cleanFiche(call_.input);
        const ids = new Set(B.mesures.filter((x) => x.P === m.P).map((x) => x.id));
        if (f.logique) f.logique.accompagnement = f.logique.accompagnement.filter((a) => !a.id || ids.has(a.id));
        done[id] = { ...f, genere: true, statut: "documente", maj: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), v: PROMPT_VERSION };
        save(); ok++; console.log(`✓ ${ok + ko}/${todo.length} ${m.cand} — ${m.t.slice(0, 70)}`); return;
      } catch (e) { if (attempt === 0) { msgs.push({ role: "assistant", content: d.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: call_.id, content: "Fiche refusée : il faut au moins 2 critiques avec une URL réelle trouvée pendant la recherche. Cherche encore puis rappelle enregistrer_fiche.", is_error: true }] }); continue; } }
    } else if (attempt === 0) { msgs.push({ role: "assistant", content: d.content }, { role: "user", content: "Appelle maintenant l'outil enregistrer_fiche avec la fiche complète." }); continue; }
  }
  ko++; console.log(`✗ ${ok + ko}/${todo.length} pas assez de sources : ${m.cand} — ${m.t.slice(0, 70)}`);
}

const queue = [...todo];
await Promise.all(Array.from({ length: PAR }, async () => { while (queue.length && !STOP) { const id = queue.shift(); try { await one(id); } catch (e) { ko++; console.log(`✗ ${id} : ${e.message}`); } } }));
if (STOP) console.log("\n⚠ Arrêt : crédit Anthropic épuisé. Recharge puis relance la même commande, le script reprendra où il s'est arrêté.");
const usd = cost.in / 1e6 * 2 + cost.out / 1e6 * 10 + cost.search * 0.01;
console.log(`\nTerminé : ${ok} fiches, ${ko} échecs. Coût estimé (Sonnet 5.5, hors taxes) : ≈ ${usd.toFixed(2)} $ (${cost.search} recherches web).`);
console.log("Ensuite : python3 build.py  puis  git add -A && git commit -m \"Fiches générées\" && git push");
