// Objets métier de Swipe 2027 : la même forme partout (données, IA, base).
// Les schémas JSON servent (1) à forcer la sortie structurée de Claude, (2) à valider avant d'enregistrer.

/** Une source citée. */
export const SOURCE = {
  type: "object",
  properties: {
    media: { type: "string", description: "Nom du média ou de l'institution" },
    url: { type: "string", description: "URL réelle trouvée pendant la recherche" }
  },
  required: ["media", "url"]
};

/** Volet économique d'une mesure. */
export const ECO = {
  type: "object",
  properties: {
    chiffre: { type: "string", description: "Résumé très court du coût ou du gain, ex. « ≈ 58 Md€ / an » ou « Non chiffré »" },
    cout: { type: "string" },
    financement: { type: "string" },
    rapporte: { type: "string" },
    sources: { type: "array", items: SOURCE }
  },
  required: ["chiffre", "cout", "financement", "rapporte", "sources"]
};

const ITEM_SOURCE = (extra) => ({
  type: "object",
  properties: { ...extra, texte: { type: "string" }, media: { type: "string" }, url: { type: "string" } },
  required: [...Object.keys(extra), "texte", "url"]
});

/** Fiche sourcée (même format que data/fiches.json). */
export const FICHE = {
  type: "object",
  properties: {
    resume: { type: "string", description: "Le débat en une phrase" },
    logique: { type: "object", description: "Le raisonnement du camp qui propose, avec ses sources", properties: {
      texte: { type: "string" },
      arguments: { type: "array", items: { type: "object", properties: { texte: { type: "string" }, media: { type: "string" }, url: { type: "string" } }, required: ["texte", "url"] } },
      accompagnement: { type: "array", items: { type: "object", properties: { id: { type: "string" }, texte: { type: "string" }, url: { type: "string" } }, required: ["texte"] } } }, required: ["texte"] },
    concret: { type: "array", items: { type: "string" }, description: "3 à 4 faits" },
    eco: ECO,
    similaires: { type: "array", items: { type: "object", properties: { camp: { type: "string" }, prop: { type: "string" } }, required: ["camp", "prop"] } },
    critiques: { type: "array", items: ITEM_SOURCE({ camp: { type: "string" }, qui: { type: "string" } }) },
    reponses: { type: "array", items: ITEM_SOURCE({ qui: { type: "string" } }) },
    tensions: { type: "array", items: { type: "string" } },
    monde: { type: "array", items: ITEM_SOURCE({ pays: { type: "string" } }) }
  },
  required: ["resume", "logique", "concret", "eco", "similaires", "critiques", "reponses", "tensions", "monde"]
};

/** Validation légère + nettoyage : on retire tout item sans URL http(s). */
export function cleanFiche(f) {
  const ok = (x) => x && typeof x.url === "string" && /^https?:\/\//.test(x.url);
  const arr = (x) => (Array.isArray(x) ? x : []);
  const out = {
    resume: String(f.resume || "").slice(0, 400),
    logique: f.logique ? { texte: String(f.logique.texte || "").slice(0, 1500), arguments: arr(f.logique.arguments).filter(ok).slice(0, 6), accompagnement: arr(f.logique.accompagnement).slice(0, 8) } : null,
    concret: arr(f.concret).map(String).slice(0, 6),
    eco: f.eco ? { chiffre: String(f.eco.chiffre || "Non chiffré"), cout: String(f.eco.cout || "—"), financement: String(f.eco.financement || "—"), rapporte: String(f.eco.rapporte || "—"), sources: arr(f.eco.sources).filter(ok).slice(0, 5) } : null,
    similaires: arr(f.similaires).slice(0, 6),
    critiques: arr(f.critiques).filter(ok).slice(0, 8),
    reponses: arr(f.reponses).filter(ok).slice(0, 5),
    tensions: arr(f.tensions).map(String).slice(0, 6),
    monde: arr(f.monde).filter(ok).slice(0, 6)
  };
  if (!out.resume || out.critiques.length < 2) throw new Error("fiche_incomplete");
  return out;
}

/*
 Autres objets (documentés ici, utilisés côté front et dans data/base.json) :

 Candidat  { key, nom, cand, long, eco, ecoUrl, note }
 Mesure    { id, P (clé candidat), t (texte), section, partie, intro?, url, cle (mesure clé) }
 Scrutin   { n, date, type, adopte, titre, pour, contre, abst, g: { GROUPE: [position, pour, contre, abst, membres] }, url }
 Condamnation { personne, parti, famille, statut ("définitive" | "non définitive"), intitule, peine, description, url, sources[] }
 Message   { role: "user" | "assistant", content }
*/
