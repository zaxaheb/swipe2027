# Mise à jour des programmes, 26 novembre 2026 : textes repris MOT POUR MOT des sources, avec leur lien.
# Fichiers bruts dans sources/ :
#   - edouardphilippe_2026-11-26.json : « propositions phares » des 17 thèmes de https://www.edouardphilippe.fr/programme
#   - lafrancehumaniste_2026-11-26.json : 258 propositions de « Réussir à nouveau » (Villepin), 1re phrase de chacune
#     (deux quand la première n'est qu'un titre)
#   - wikiglucksmann_2026-11-22.json : document « Le programme de Raphaël Glucksmann pour 2027 » (WikiGlucksmann, non officiel),
#     on n'en garde que le livret « Révolution écologique », le livre et les déclarations de campagne ;
#     l'Acte I de Place Publique vient de Votons (texte intégral, place-publique.eu)
#   - votons_2026-11-26.json : mesures relevées par https://votons-2027.fr, citées mot pour mot depuis le site officiel
#     de chaque candidat (une URL source par mesure)
# Pour chaque candidat importé, les mesures de l'app sont remplacées par ces textes (les anciennes reformulations de
# presse ou de France-Vote sont retirées). Les identifiants des mesures qui restent ne changent pas.
# Idempotent. Usage : python3 maj_2026_11_26.py
import json, os
D = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(D, "sources")
F = os.path.join(D, "autres_candidats.json")
x = json.load(open(F))
S, M, PR = x["sections"], x["mesures"], x["progs"]
J = lambda f: json.load(open(os.path.join(SRC, f)))

def sec_index(P, theme, url):
    si = next((i for i, s in enumerate(S) if s["prog"] == P and s["section"] == theme), None)
    if si is None:
        S.append({"partie": "Programme", "chapitre": theme, "section": theme, "intro": "", "url": url, "prog": P}); si = len(S) - 1
    return si

def sync(P, rows):
    """rows : [(section, texte, url, cle, origine)] — l'ensemble exact des mesures du candidat P."""
    want = {}
    for r in rows: want.setdefault(r[1], r)
    M[:] = [m for m in M if S[m["s"]]["prog"] != P or m["t"] in want]
    have = {m["t"]: m for m in M if S[m["s"]]["prog"] == P}
    ids = {m["id"] for m in M}
    for theme, t, url, cle, orig in want.values():
        si = sec_index(P, theme, url)
        if t in have:
            m = have[t]; m["s"], m["src"], m["cle"] = si, url, cle
        else:
            n = sum(1 for m in M if m["s"] == si) + 1
            while f"{P.lower()}-{si}-{n}" in ids: n += 1
            m = {"id": f"{P.lower()}-{si}-{n}", "s": si, "cle": cle, "t": t, "sous": [], "page": None, "src": url}
            M.append(m); ids.add(m["id"])
        if orig: m["orig"] = orig
        else: m.pop("orig", None)

# ---------------------------------------------------------------------- Édouard Philippe
EP = "https://www.edouardphilippe.fr/programme/"
OFFICIEL = {   # anciennes mesures (presse) dont l'identifiant est gardé, avec le texte officiel correspondant
 "philippe-1-1": "Porter progressivement l’âge de départ à 65 ans et la durée de cotisation à 45 ans, en moins de dix ans.",
 "philippe-2-1": "Réduire de 250 000 le nombre de postes de fonctionnaires sur le quinquennat, en ne remplaçant pas un fonctionnaire sur trois partant à la retraite dans les fonctions de bureau, grâce aux gains de productivité de l’IA.",
 "philippe-3-1": "Limiter à 12 mois l’indemnisation chômage des moins de 50 ans.",
 "philippe-5-1": "Verser une allocation familiale de 350 € par mois dès le premier enfant.",
 "philippe-5-3": "Accorder un prêt à taux zéro à chaque naissance.",
 "philippe-5-4": "Supprimer l’impôt sur le revenu des classes moyennes les trois premières années de l’enfant.",
 "philippe-6-1": "Augmenter de 20 % en moyenne le salaire des enseignants pendant le quinquennat.",
 "philippe-7-1": "Diviser l’immigration légale par deux, pour la ramener au niveau d’il y a 15 ans.",
 "philippe-8-1": "Un fonds d’adaptation au changement climatique de 2 milliards d’euros par an.",
}
for m in M:
    if m["id"] in OFFICIEL: m["t"] = OFFICIEL[m["id"]]
rows = []
for k, items in J("edouardphilippe_2026-11-26.json").items():
    theme, slug = k.split("|")
    rows += [(theme, t, EP + slug, i < 2, None) for i, t in enumerate(items)]
sync("PHILIPPE", rows)
PR["PHILIPPE"].update(
    note="Programme « Croire en nous » (volume 1) présenté le 18 novembre 2026. Les cartes reprennent mot pour mot les « propositions phares » des 17 thèmes de son site. Un volume 2 (culture, sport, santé, institutions) est annoncé pour début 2027.",
    eco="Édouard Philippe vise un déficit sous 2,5 % de la richesse nationale à la fin du quinquennat, « soit près de 150 milliards d’économies », avec une règle d’or constitutionnelle et aucun nouvel impôt pendant cinq ans.",
    ecoUrl=EP + "comptes-publics",
    sources=[{"t": "Site de campagne : le programme, thème par thème (propositions phares)", "url": EP[:-1]}])

# ---------------------------------------------------------------------- Dominique de Villepin
VC = "https://lafrancehumaniste.fr/programme/reussir-a-nouveau/chapitre-%d.html"
CH = [(1, 11), (12, 17), (18, 38), (39, 46), (47, 49), (50, 65), (66, 73), (74, 81), (82, 86), (87, 92), (93, 104), (105, 121), (122, 129),
      (130, 140), (141, 152), (153, 162), (163, 179), (180, 185), (186, 187), (188, 205), (206, 213), (214, 230), (231, 241), (242, 248), (249, 258)]
chap = lambda n: next(i + 1 for i, (a, b) in enumerate(CH) if a <= n <= b)
CLE = {2, 10, 47, 48, 74, 75, 87, 106, 107, 147, 162, 186, 231, 237, 246}
PR.setdefault("VILLEPIN", {"nom": "La France humaniste", "cand": "Dominique de Villepin", "long": "La France humaniste · Dominique de Villepin", "badge": "",
    "grad": ["#1d3557,#0b1a2e", "#264a73,#10233d"]})
rows, sec = [], ""
for n, s_, t in sorted(J("lafrancehumaniste_2026-11-26.json"), key=lambda r: r[0]):
    if s_: sec = s_
    rows.append((sec, t, VC % chap(n), n in CLE, f"Proposition n° {n}"))
sync("VILLEPIN", rows)
PR["VILLEPIN"].update(
    eco="Dominique de Villepin vise un déficit public de 2,9 % du PIB en 2031, avec une hypothèse de croissance de 0,8 % les premières années, financé notamment par l’extinction des niches fiscales et sociales et un « big bang » fiscal (neuf impôts, rétablissement de l’ISF).",
    ecoUrl=VC % 1,
    note="Candidature annoncée le 20 novembre 2026. Programme « Réussir à nouveau » : 258 propositions, reprises mot pour mot (première phrase de chacune) depuis le site de La France humaniste.",
    sources=[{"t": "La France humaniste : programme « Réussir à nouveau » (258 propositions)", "url": "https://lafrancehumaniste.fr/france2027.html"}])

# ---------------------------------------------------------------------- Votons (programmes officiels cités mot pour mot)
V = J("votons_2026-11-26.json")["cands"]
THEME = {"economie": "Économie", "climat": "Écologie", "securite": "Sécurité", "europe": "Europe", "sante": "Santé et social",
         "education": "Éducation", "immigration": "Immigration", "institutions": "Institutions et société"}
def votons(slug):
    out = []
    for th, blk in V[slug]["themes"].items():
        out += [(THEME[th], i["t"], i["src"] or blk["off"], i["ph"], None) for i in blk["items"]]
    return out
def urls(slug):
    seen = []
    for blk in V[slug]["themes"].values():
        for i in blk["items"]:
            if i["src"] and i["src"] not in seen: seen.append(i["src"])
    return seen

# Glucksmann : Acte I (Votons, texte officiel) + livret, livre et déclarations (WikiGlucksmann)
WG = "https://www.wikiglucksmann.fr/programme.html"
rows = votons("glucksmann")
for theme, t, cat, src in J("wikiglucksmann_2026-11-22.json"):
    if cat == "Acte I de Place Publique": continue
    rows.append((theme, t, WG, cat.startswith("Programme 2027"), cat + " — " + src))
sync("GLUCKSMANN", rows)
PR["GLUCKSMANN"].update(
    note="Programme 2027 en cours de publication (première partie, livret « Révolution écologique », le 9 novembre 2026). Cartes : l'Acte I de Place Publique (texte officiel), le livret, son livre « Nous avons encore envie » et ses déclarations de campagne, mot pour mot.",
    sources=[{"t": "Place Publique : l'Acte I (texte intégral)", "url": "https://place-publique.eu/pages/6mRSwq5tuSrSi68Cw1IADX/l-acte-i"},
             {"t": "WikiGlucksmann : « Le programme de Raphaël Glucksmann pour 2027 » (document non officiel, 22 nov. 2026), pour le livret, le livre et les déclarations", "url": WG},
             {"t": "Relevé des mesures de l'Acte I : Votons", "url": "https://votons-2027.fr/candidats/glucksmann/programme"}])

NOUVEAUX = {
 "MIKOLAJCZAK": {"nom": "Équinoxe", "cand": "Antoine Mikolajczak", "long": "Équinoxe · Antoine Mikolajczak", "badge": "", "grad": ["#2e7d6b,#103a31", "#36907c,#14463b"],
                 "eco": "Pas de chiffrage global publié dans nos sources.", "note": "Candidat désigné du parti écologiste Équinoxe."},
 "DUBUISSON":   {"nom": "Les Gaulois", "cand": "Emmanuel Dubuisson", "long": "Les Gaulois · Emmanuel Dubuisson (indépendant)", "badge": "", "grad": ["#5d4e37,#271f14", "#6d5c42,#2f2619"],
                 "eco": "Pas de chiffrage global publié dans nos sources.", "note": "Candidat indépendant, soutenu par son association électorale « Les Gaulois »."},
}
for k, v in NOUVEAUX.items(): PR.setdefault(k, v)
IMPORT = {"ARTHAUD": "arthaud", "ASSELINEAU": "asselineau", "ATTAL": "attal", "BATHO": "batho", "BERTRAND": "bertrand", "BRANCO": "branco",
          "DUPONTAIGNAN": "dupont-aignan", "PHILIPPOT": "philippot", "RETAILLEAU": "retailleau", "TONDELIER": "tondelier", "LISNARD": "lisnard",
          "BOUAMRANE": "bouamrane", "KAZIB": "kazib", "LABIB": "labib", "MIKOLAJCZAK": "mikolajczak", "CAZENEUVE": "cazeneuve",
          "DUBUISSON": "dubuisson", "POLONY": "polony"}
for P, slug in IMPORT.items():
    sync(P, votons(slug))
    c = V[slug]; u = urls(slug)
    srcs = [{"t": ("Prises de position publiques" if c["nopub"] else "Programme officiel") + " : " + x.split("/")[2].replace("www.", ""), "url": x} for x in u]
    srcs.append({"t": "Relevé mot pour mot des mesures : Votons", "url": f"https://votons-2027.fr/candidats/{slug}/programme"})
    PR[P]["sources"] = srcs
    PR[P].pop("ecoUrl", None) if "france-vote" in (PR[P].get("ecoUrl") or "") else None
COMPLET = {"ASSELINEAU", "ATTAL", "BRANCO", "DUPONTAIGNAN", "PHILIPPOT", "RETAILLEAU", "TONDELIER", "LISNARD", "KAZIB", "MIKOLAJCZAK", "DUBUISSON"}
for P, slug in IMPORT.items():
    PR[P]["note"] = ("Pas de programme publié : cartes tirées de ses prises de position publiques, citées mot pour mot." if V[slug]["nopub"]
                     else "Programme publié : cartes tirées de son programme officiel, citées mot pour mot." if P in COMPLET
                     else "Programme partiel : propositions publiées sur son site, citées mot pour mot.")
PR["TONDELIER"]["note"] = "Candidature maintenue à ce jour. Le 18 novembre 2026, Marine Tondelier s'est dite prête à « travailler à une coalition » autour de Jean-Luc Mélenchon. Les adhérents votent du 10 au 13 décembre : candidature autonome, soutien à Mélenchon ou à Glucksmann. Cartes tirées du projet 2027 des Écologistes, cité mot pour mot."

# Candidats non importés : programme 2027 pas encore publié (Votons ne cite pour eux que d'anciens programmes)
PR["ZEMMOUR"].setdefault("sources", [{"t": "Déclarations rapportées par la presse (TF1, franceinfo, nov. 2026) : formulations de la presse", "url": "https://www.politiquematin.fr/zemmour-presidentielle-2027-confirme-candidature-tf1-programme-101126-2055"}])
PR["RUFFIN"]["retrait"] = {"date": "2026-11-21", "texte": "Ne se présente plus : retrait annoncé le 21 novembre 2026, sans soutenir d'autre candidat.", "url": "https://www.lagazettefrance.fr/article/presidentielle-ruffin-renonce-le-paysage-se-clarifie-a-gauche"}

# programme complet publié (pastille sur la page du candidat)
for P in {"VILLEPIN"} | COMPLET:
    PR[P]["complet"] = True

# ---------------------------------------------------------------------- anciens identifiants gardés
# Quand une ancienne mesure (reformulée) correspond clairement à un texte officiel, ce texte reprend l'ancien identifiant :
# les votes et la fiche d'analyse déjà faits restent attachés. Correspondances relues à la main : sources/alias_ids_2026-11-26.json
for old, t in J("alias_ids_2026-11-26.json").items():
    if any(m["id"] == old for m in M): continue
    m = next((m for m in M if m["t"] == t), None)
    if m: m["id"] = old

# ---------------------------------------------------------------------- sections vides retirées (identifiants des mesures inchangés)
used = sorted({m["s"] for m in M}); new = {o: i for i, o in enumerate(used)}
x["sections"] = [S[o] for o in used]
for m in M: m["s"] = new[m["s"]]

json.dump(x, open(F, "w"), ensure_ascii=False, indent=1)
print(len(PR), "candidats ;", len(M), "mesures")
