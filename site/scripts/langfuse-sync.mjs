// Envoie les prompts de lib/prompts.js dans Langfuse : crée ceux qui manquent, et une nouvelle version (label production)
// pour ceux dont le texte a changé. La config déjà réglée dans Langfuse (modèle…) est conservée.
// Usage (depuis le dossier site/) :
//   node --env-file=../.env.langfuse scripts/langfuse-sync.mjs                 envoie les changements
//   node --env-file=../.env.langfuse scripts/langfuse-sync.mjs --dry           montre ce qui changerait, sans rien envoyer
//   node --env-file=../.env.langfuse scripts/langfuse-sync.mjs --reset-config  remet aussi la config par défaut ci-dessous
// ../.env.langfuse contient LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL (fichier ignoré par git).
import { TEMPLATES, TASKS } from "../lib/prompts.js";
import { enabled, fetchPrompt, createPrompt } from "../lib/langfuse.js";

if (!enabled()) { console.error("Il manque LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY. Lance : node --env-file=../.env.langfuse scripts/langfuse-sync.mjs"); process.exit(1); }
const dry = process.argv.includes("--dry"), reset = process.argv.includes("--reset-config");
const chat = process.env.LLM_CHAT || process.env.LLM_DEFAULT || "anthropic:claude-sonnet-5-5";
const fiche = process.env.LLM_FICHE || process.env.LLM_DEFAULT || "anthropic:claude-sonnet-5-5";
const CONFIG = {
  system: {}, consignes_chat: {},
  general: { model: chat, max_searches: 10, max_tokens: 3000 },
  mesure:  { model: chat, max_searches: 10, max_tokens: 3000 },
  prof:    { model: chat, max_searches: 10, max_tokens: 3000 },
  quiz:    { model: chat, max_tokens: 2000 },
  profil:  { model: chat, max_tokens: 700 },
  fiche:   { model: fiche, max_searches: 3, max_tokens: 5000 }
};
let n = 0;
for (const key of ["system", "consignes_chat", ...TASKS]) {
  const name = "swipe-" + key, cur = await fetchPrompt(name);
  const textChanged = !cur || cur.prompt !== TEMPLATES[key];
  const config = cur && !reset ? cur.config : CONFIG[key];
  if (!textChanged && !(reset && JSON.stringify(cur.config) !== JSON.stringify(CONFIG[key]))) { console.log(`= ${name} v${cur.version} inchangé`); continue; }
  n++;
  if (dry) { console.log(`~ ${name} ${cur ? `v${cur.version} → nouvelle version` : "à créer"}`); continue; }
  const r = await createPrompt({ name, prompt: TEMPLATES[key], config, commitMessage: cur ? "Mise à jour depuis lib/prompts.js" : "Import depuis lib/prompts.js" });
  console.log(`✓ ${name} v${r.version}${config?.model ? " · " + config.model : ""}`);
}
console.log(n ? (dry ? `\n${n} prompt(s) à envoyer. Relance sans --dry pour les envoyer.` : "\nC'est en ligne : le site prend la nouvelle version « production » en moins d'une minute.") : "\nRien à changer.");
console.log("Ancien prompt inutilisé : swipe-regles (remplacé par swipe-system). Tu peux l'archiver dans Langfuse.");
