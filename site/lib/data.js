// Base de connaissances côté serveur (générée par build.py dans data/base.json).
import { readFileSync } from "node:fs";

let BASE = null;
export function base() {
  if (!BASE) {
    // Chemin relatif à ce fichier : Vercel l'inclut automatiquement dans la fonction.
    BASE = JSON.parse(readFileSync(new URL("../data/base.json", import.meta.url), "utf8"));
    BASE.byId = Object.fromEntries(BASE.mesures.map((m) => [m.id, m]));
    const n = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    BASE.norm = n;
    BASE.mesures.forEach((m) => { const c = BASE.candidats[m.P] || {}; m._n = n(`${m.t} ${m.section} ${c.cand} ${c.nom} ${m.P}`); });
    BASE.scrutins.forEach((s) => (s._n = n(s.titre)));
    BASE.condamnations.forEach((c) => (c._n = n(`${c.personne} ${c.parti} ${c.famille} ${c.intitule}`)));
  }
  return BASE;
}

/** Mesure enrichie des infos du candidat (pour les prompts). */
export function mesure(id) {
  const B = base(); const m = B.byId[id]; if (!m) return null;
  const c = B.candidats[m.P] || {};
  return { ...m, cand: c.cand, nom: c.nom };
}

const STOP = new Set("pour dans avec sans plus tous toutes leur leurs etre faire mettre une des les aux par sur qui que est son ses nos notre nous vous cette ces entre lors afin ainsi tout tres moins quoi comment quel quelle quels quelles propose proposent".split(" "));

/** Récupération par mots-clés : renvoie un bloc texte compact pour <base>. */
export function retrieve(q) {
  const B = base();
  const w = [...new Set(B.norm(q).split(/[^a-z0-9]+/).filter((x) => x.length > 3 && !STOP.has(x)).map((x) => x.replace(/(s|x)$/, "")))];
  if (!w.length) return "";
  const sc = (t) => w.reduce((s, x) => s + (t.includes(x) ? 1 : 0), 0);
  const top = (arr, k) => arr.map((x) => [x, sc(x._n)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, k).map((x) => x[0]);
  const ms = top(B.mesures, 14).map((m) => `- [${B.candidats[m.P]?.cand}] ${m.t} (${m.section}) ${m.url}${B.fiches[m.id] ? ` — fiche : ${B.fiches[m.id].resume}` : ""}`);
  const vs = top(B.scrutins, 5).map((s) => `- ${s.date} ${s.titre} → ${s.adopte ? "adopté" : "rejeté"} ; ${Object.entries(s.g).map(([k, v]) => `${k} ${v[0]}`).join(", ")} ${s.url}`);
  const cs = top(B.condamnations, 6).map((c) => `- ${c.personne} (${c.parti}) : ${c.intitule} — ${c.statut}${c.peine ? " — " + c.peine : ""} ${c.url}`);
  return [ms.length && "MESURES\n" + ms.join("\n"), vs.length && "VOTES À L'ASSEMBLÉE\n" + vs.join("\n"), cs.length && "CONDAMNATIONS\n" + cs.join("\n")].filter(Boolean).join("\n\n").slice(0, 12000);
}
