// Copie les prompts de lib/prompts.js dans Langfuse (une fois, ou après une modification locale).
// Usage (depuis le dossier site/) :
//   node --env-file=../.env.langfuse scripts/langfuse-sync.mjs           crée les prompts qui n'existent pas encore
//   node --env-file=../.env.langfuse scripts/langfuse-sync.mjs --force   crée une nouvelle version de tous les prompts (label production)
// Le fichier ../.env.langfuse contient LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL (il est ignoré par git).
// Ensuite, tout se règle dans Langfuse : texte des prompts, et dans « Config » : model ("openai:gpt-6-luna"), max_searches, max_tokens.
import { TEMPLATES } from "../lib/prompts.js";
import { enabled, listPromptNames, createPrompt } from "../lib/langfuse.js";

if (!enabled()) { console.error("Il manque LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY. Lance : node --env-file=../.env.langfuse scripts/langfuse-sync.mjs"); process.exit(1); }
const force = process.argv.includes("--force");
const chat = process.env.LLM_CHAT || process.env.LLM_DEFAULT || "anthropic:claude-sonnet-5-5";
const fiche = process.env.LLM_FICHE || process.env.LLM_DEFAULT || "anthropic:claude-sonnet-5-5";
const CONFIG = {
  regles:  { note: "Bloc commun inséré dans general, mesure et prof via {{regles}}." },
  general: { model: chat, max_searches: 10, max_tokens: 3000 },
  mesure:  { model: chat, max_searches: 10, max_tokens: 3000 },
  prof:    { model: chat, max_searches: 10, max_tokens: 3000 },
  quiz:    { model: chat, max_tokens: 2000 },
  profil:  { model: chat, max_tokens: 700 },
  fiche:   { model: fiche, max_searches: 3, max_tokens: 5000 }
};
const exist = await listPromptNames();
for (const [key, prompt] of Object.entries(TEMPLATES)) {
  const name = "swipe-" + key;
  if (exist.has(name) && !force) { console.log(`= ${name} existe déjà (ajoute --force pour créer une nouvelle version)`); continue; }
  const r = await createPrompt({ name, prompt, config: CONFIG[key] || {}, commitMessage: "Import depuis lib/prompts.js" });
  console.log(`✓ ${name} v${r.version} (${CONFIG[key]?.model || "sans modèle"})`);
}
console.log("\nC'est prêt. Change le texte ou le modèle dans Langfuse > Prompts : le site prend la nouvelle version « production » en moins d'une minute.");
