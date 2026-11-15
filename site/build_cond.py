# Condamnations : fusion de Casier Politique (source principale) et de Poligraph (personnes absentes de Casier Politique).
# - Casier Politique (https://casier-politique.fr, Raphaël Jolivet, licence CC BY-NC-SA 4.0) : extraction automatique
#   de Wikipédia et Wikidata, les condamnations étant extraites du texte par un modèle d'IA (Apertus). Peut contenir des erreurs.
# - Poligraph (https://poligraph.fr) : fiches avec articles de presse, gardées seulement pour les personnes absentes de Casier Politique.
# Le positionnement gauche-droite des partis (axe du graphique) est NOTRE classement, d'après le positionnement indiqué sur Wikipédia.
import json, re, unicodedata

# parti (tel qu'écrit par Casier Politique) → (famille affichée, position : -2 extrême gauche … 0 centre … 2 extrême droite ; None = non placé)
PARTIS = {
    "Les Républicains": ("LR / UMP / RPR", 1), "Rassemblement pour la République": ("LR / UMP / RPR", 1), "Union pour un mouvement populaire": ("LR / UMP / RPR", 1),
    "Rassemblement national": ("RN / FN", 2), "Front national": ("RN / FN", 2),
    "Parti socialiste": ("PS", -0.75), "Union pour la démocratie française": ("UDI / UDF", 0.5), "Union des démocrates et indépendants": ("UDI / UDF", 0.5),
    "Les Écologistes – Europe Écologie Les Verts": ("Écologistes", -0.75), "Reconquête": ("Reconquête", 2),
    "Parti radical de gauche": ("Autres / non précisé", -0.5), "Parti nationaliste français et européen": ("Autres / non précisé", 2),
    "Mouvement démocrate": ("MoDem", 0), "Renaissance": ("Renaissance / LREM", 0.25), "La République en marche": ("Renaissance / LREM", 0.25),
    "Parti communiste de France (marxiste-léniniste-maoïste)": ("Autres / non précisé", -2), "La France insoumise": ("LFI", -1.5),
    "Mouvement radical": ("Autres / non précisé", 0.25), "Horizons": ("Horizons", 0.5), "républicains indépendants": ("Autres / non précisé", 0.5),
    "Rassemblement pour la France": ("Autres / non précisé", 1.25), "Les Centristes": ("Autres / non précisé", 0.5), "Mouvement national républicain": ("Autres / non précisé", 2),
    "Identité-Libertés": ("Autres / non précisé", 2), "Parti républicain": ("Autres / non précisé", 0.5), "Les Nouveaux Démocrates": ("Autres / non précisé", -0.5),
    "Ligue du Sud": ("Autres / non précisé", 2), "Rassemblement pour la France et l'indépendance de l'Europe": ("Autres / non précisé", 1.25),
    "En commun": ("Autres / non précisé", 0), "Parti de l'in-nocence": ("Autres / non précisé", 2), "Union des démocrates pour la République": ("LR / UMP / RPR", 1),
    "Parti de gauche": ("Autres / non précisé", -1.5), "Alliance centriste": ("Autres / non précisé", 0), "Union des droites pour la République": ("Autres / non précisé", 1.75),
    "Parti de la France": ("Autres / non précisé", 2), "Soyons libres": ("Autres / non précisé", 1), "Convention pour une alternative progressiste": ("Autres / non précisé", -1),
    "Union des démocrates et des écologistes": ("Autres / non précisé", -0.5), "Debout la France": ("Autres / non précisé", 1.5), "Parti communiste breton": ("Autres / non précisé", -1.5),
    "La France audacieuse": ("Autres / non précisé", 1), "Parti communiste français": ("PCF", -1.5),
}
norm = lambda s: unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()

def euros(n):
    return f"{int(n):,}".replace(",", " ") + " €"

def peine(c):
    p = []
    if c.get("prison"): p.append("prison : " + c["prison"])
    if c.get("amende"): p.append("amende : " + re.sub(r"(\d+)\s*€", lambda m: euros(m.group(1)), str(c["amende"])))
    elif c.get("amende_montant"): p.append("amende : " + euros(c["amende_montant"]))
    if c.get("ineligibilite"): p.append("inéligibilité : " + c["ineligibilite"])
    if c.get("autre_peine"): p.append(c["autre_peine"])
    return " · ".join(p)

def build(D):
    k = json.load(open(D + "condamnations/casier-politique.json"))
    pg = json.load(open(D + "condamnations/condamnations.json"))
    out, noms = [], set()
    for p in k["personnalites"]:
        noms.add(norm(p["nom"]))
        for c in p["condamnations"]:
            fam, x = PARTIS.get(c.get("parti"), ("Autres / non précisé", None))
            rec = c.get("recours") or "definitif"
            out.append({
                "src": "casier", "personne": p["nom"], "parti": c.get("parti") or "non précisé", "famille": fam, "x": x,
                "annee": c.get("annee"), "date": c.get("date"),
                "statut": "définitive" if rec == "definitif" else "non définitive", "recours": rec,
                "intitule": c.get("affaire") or c.get("infraction") or "Condamnation", "infraction": c.get("infraction") or "",
                "categorie": " · ".join(c.get("categories") or []), "peine": peine(c),
                "mois": int(c.get("prison_mois") or 0), "description": c.get("description") or "", "url": p.get("wikipedia") or "", "sources": []})
    gardees = [dict(x, src="poligraph", x=None, annee=None) for x in pg["condamnations"] if norm(x["personne"]) not in noms]
    out += gardees
    out.sort(key=lambda c: -(c.get("annee") or int(str(c.get("annee_faits") or "0")[:4] or 0)))
    return {
        "extrait_le": k.get("mise_a_jour"),
        "sources": {
            "casier": {"nom": "Casier Politique", "url": "https://casier-politique.fr", "auteur": "Raphaël Jolivet", "licence": "CC BY-NC-SA 4.0",
                       "methode": "extraction automatique de Wikipédia et Wikidata ; les condamnations sont extraites du texte par un modèle d'IA (Apertus)",
                       "n": len(out) - len(gardees), "maj": k.get("mise_a_jour")},
            "poligraph": {"nom": "Poligraph", "url": "https://poligraph.fr/affaires/condamnations", "n": len(gardees), "maj": pg.get("extrait_le"),
                          "methode": "fiches avec articles de presse ; gardées seulement pour les personnes absentes de Casier Politique"}},
        "avertissement": "La présomption d'innocence s'applique à toute condamnation non définitive (appel ou pourvoi en cours). Liste non exhaustive.",
        "condamnations": out}
