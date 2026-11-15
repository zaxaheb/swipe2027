// Génère des fiches sourcées en lot (recherche web), en parallèle, avec le modèle de son choix.
// Usage (depuis le dossier site/) :
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generer-fiches.mjs --n 100
//   OPENAI_API_KEY=sk-...        node scripts/generer-fiches.mjs --n 20 --model openai:gpt-6-luna
//   GEMINI_API_KEY=...           node scripts/generer-fiches.mjs --n 20 --model gemini:gemini-3.8-flash
// Options : --n (défaut 100), --parallel (défaut 4), --recherches (par fiche, défaut 3), --model fournisseur:modèle (défaut : LLM_FICHE, sinon anthropic:claude-sonnet-5-5), --ids id1,id2
// Les fiches sont ajoutées au fur et à mesure dans ../data/fiches_auto.json (on peut relancer : les fiches déjà faites sont sautées).
// Coût maîtrisé : recherches plafonnées (sauf Gemini, qui n'a pas de plafond par requête), consigne système mise en cache, arrêt propre si le crédit est épuisé.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getSystem, VARS, ficheUser } from "../lib/prompts.js";
import { FICHE, cleanFiche } from "../lib/schemas.js";
import { base, mesure } from "../lib/data.js";
import * as llm from "../lib/llm.js";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg("n", 100)), PAR = Number(arg("parallel", 4)), SEARCHES = Number(arg("recherches", 3));
const S = await getSystem("fiche", VARS.fiche(SEARCHES));   // prompt Langfuse « swipe-fiche » si LANGFUSE_* est défini, sinon local
const M = llm.parseSpec(arg("model", S.config.model || process.env.LLM_FICHE || process.env.LLM_DEFAULT || "anthropic:" + (process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5")));
const KEYVAR = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", gemini: "GEMINI_API_KEY" }[M.provider];
if (!process.env[KEYVAR]) { console.error(`Il manque la clé : ${KEYVAR}=... node scripts/generer-fiches.mjs --model ${M.provider}:${M.model}`); process.exit(1); }
const MODEL = `${M.provider}:${M.model}`;

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
const tot = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, searches: 0 };
const add = (u) => { for (const k in tot) tot[k] += u?.[k] || 0; };

let ok = 0, ko = 0;
async function one(id) {
  const m = mesure(id); if (!m) return;
  const autres = B.mesures.filter((x) => x.P === m.P && x.id !== id && (m.P !== "LFI" || x.section === m.section || x._n.split(" ").some((w) => w.length > 6 && m._n?.includes(w)))).slice(0, 120);
  const msgs = [{ role: "user", content: ficheUser(m, autres) }];
  for (let attempt = 0; attempt < 2 && !STOP; attempt++) {
    let data;
    try { const r = await llm.json({ ...M, system: S.text, trace: { name: "fiche", prompt: S.prompt, tags: ["fiche", "lot"], metadata: { mesure: id } }, messages: msgs, schema: FICHE, name: "enregistrer_fiche", description: "Enregistre la fiche sourcée finale. À appeler une seule fois, à la fin.", web: { maxSearches: SEARCHES }, maxTokens: 5000, retries: 8 }); add(r.usage); data = r.data; }
    catch (e) {
      if (e.code === "credit") { STOP = true; throw new Error(`CRÉDIT ÉPUISÉ chez ${M.provider} : recharge ton compte, puis relance la même commande (les fiches déjà faites sont gardées).`); }
      if (e.code === "config") { STOP = true; throw e; }
      if (attempt === 0) continue; throw e;
    }
    try {
      const f = cleanFiche(data);
      const ids = new Set(B.mesures.filter((x) => x.P === m.P).map((x) => x.id));
      if (f.logique) f.logique.accompagnement = (f.logique.accompagnement || []).filter((a) => !a.id || ids.has(a.id));
      done[id] = { ...f, genere: true, statut: "documente", modele: MODEL, prompt: S.version, maj: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), v: S.version };
      save(); ok++; console.log(`✓ ${ok + ko}/${todo.length} ${m.cand} — ${m.t.slice(0, 70)}`); return;
    } catch (e) {
      msgs.push({ role: "assistant", content: JSON.stringify(data).slice(0, 20000) }, { role: "user", content: "Fiche refusée : il faut au moins 2 critiques, chacune avec une URL réelle trouvée pendant la recherche. Cherche encore, puis renvoie la fiche complète." });
    }
  }
  ko++; console.log(`✗ ${ok + ko}/${todo.length} pas assez de sources : ${m.cand} — ${m.t.slice(0, 70)}`);
}

const queue = [...todo];
await Promise.all(Array.from({ length: PAR }, async () => { while (queue.length && !STOP) { const id = queue.shift(); try { await one(id); } catch (e) { ko++; console.log(`✗ ${id} : ${e.message}`); } } }));
if (STOP) console.log(`\n⚠ Arrêt propre : crédit épuisé (ou configuration incorrecte) chez ${M.provider}. Recharge, puis relance la même commande : le script reprendra où il s'est arrêté.`);
const usd = llm.cost(M.model, tot);
console.log(`\nTerminé : ${ok} fiches, ${ko} échecs avec ${MODEL}. ${tot.searches} recherches web, ${Math.round(tot.in / 1000)} k tokens lus (dont ${Math.round(tot.cacheRead / 1000)} k en cache), ${Math.round(tot.out / 1000)} k écrits.` + (usd != null ? ` Coût estimé : ≈ ${usd.toFixed(2)} $ hors taxes.` : " (prix de ce modèle inconnu : vois la console du fournisseur)"));
console.log("Ensuite : python3 build.py  puis  git add -A && git commit -m \"Fiches générées\" && git push");
