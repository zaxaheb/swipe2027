// Change le modèle IA dans Langfuse, sans toucher au texte des prompts : crée une nouvelle version (label production)
// avec config.model mis à jour. Le site l'utilise en moins d'une minute, sans redéployer.
// Usage (depuis le dossier site/) :
//   node --env-file=../.env.langfuse scripts/langfuse-model.mjs openai:gpt-6-luna chat     chat, quiz, profil
//   node --env-file=../.env.langfuse scripts/langfuse-model.mjs anthropic:claude-sonnet-5-5 fiche
//   node --env-file=../.env.langfuse scripts/langfuse-model.mjs gemini:gemini-3.8-flash all
//   node --env-file=../.env.langfuse scripts/langfuse-model.mjs                            affiche les modèles actuels
// Option : --searches N  change aussi le nombre maximum de recherches web.
import { parseSpec } from "../lib/llm.js";
import { enabled, fetchPrompt, createPrompt } from "../lib/langfuse.js";

if (!enabled()) { console.error("Il manque LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY. Lance : node --env-file=../.env.langfuse scripts/langfuse-model.mjs …"); process.exit(1); }
const GROUPS = { chat: ["general", "mesure", "prof", "quiz", "profil"], fiche: ["fiche"] }; GROUPS.all = [...GROUPS.chat, ...GROUPS.fiche];
const args = process.argv.slice(2), si = args.indexOf("--searches"), searches = si >= 0 ? Number(args.splice(si, 2)[1]) : null;
const [spec, target = "all"] = args;

if (!spec) {
  for (const k of GROUPS.all) { const p = await fetchPrompt("swipe-" + k); console.log(`swipe-${k.padEnd(7)} ${p ? `v${p.version} · ${p.config?.model || "(modèle par défaut de Vercel)"}${p.config?.max_searches != null ? ` · ${p.config.max_searches} recherches max` : ""}` : "absent : lance d'abord langfuse-sync.mjs"}`); }
  process.exit(0);
}
let m; try { m = parseSpec(spec); } catch (e) { console.error(e.message + ". Exemple : openai:gpt-6-luna"); process.exit(1); }   // vérifie le format fournisseur:modèle
if (!GROUPS[target]) { console.error(`Cible inconnue « ${target} » : chat, fiche ou all.`); process.exit(1); }
for (const k of GROUPS[target]) {
  const name = "swipe-" + k, cur = await fetchPrompt(name);
  if (!cur) { console.log(`✗ ${name} absent : lance d'abord scripts/langfuse-sync.mjs`); continue; }
  const config = { ...(cur.config || {}), model: `${m.provider}:${m.model}`, ...(searches != null && cur.config?.max_searches != null ? { max_searches: searches } : {}) };
  const r = await createPrompt({ name, prompt: cur.prompt, config, commitMessage: `Modèle : ${config.model}` });
  console.log(`✓ ${name} v${r.version} · ${config.model}`);
}
console.log("\nEn ligne d'ici une minute. Vérifie avec /api/health?key=<ADMIN_PASSWORD> (la clé du fournisseur doit être dans Vercel).");
