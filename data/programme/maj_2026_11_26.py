# Mise à jour des candidats et mesures, actualité du 16 au 26 novembre 2026.
# Idempotent : relancer ne crée pas de doublon. Usage : python3 maj_2026_11_26.py
import json
F = "autres_candidats.json"
x = json.load(open(F))
S, M, PR = x["sections"], x["mesures"], x["progs"]

# réparation : identifiants en double créés par une première version de ce script
_vus = set()
for m in M:
    if m["id"] in _vus:
        k, a, b = m["id"].rsplit("-", 2); n = int(b)
        while f"{k}-{a}-{n}" in _vus or any(z["id"] == f"{k}-{a}-{n}" for z in M): n += 1
        m["id"] = f"{k}-{a}-{n}"
    _vus.add(m["id"])

PS  = "https://www.publicsenat.fr/actualites/politique/capitalisation-suppression-de-250-000-postes-de-fonctionnaires-autonomie-des-ecoles-fin-des-35-heures-aides-pour-les-familles-edouard-philippe-presente-son-projet-massif-et"
LCPP = "https://lcp.fr/actualites/presidentielle-2027-promettant-des-reformes-radicales-edouard-philippe-cherche-une"
PSV = "https://www.publicsenat.fr/actualites/politique/dominique-de-villepin-annonce-sa-candidature-a-lelection-presidentielle-une-decision-lourde-et-difficile-declare-t-il"
LCPV = "https://lcp.fr/actualites/presidentielle-2027-dominique-villepin-veut-une-nouvelle-abolition-des-privileges-et-un"
GZV = "https://www.lagazettefrance.fr/article/villepin-veut-inscrire-le-principe-de-la-negociation-sociale-dans-la-constitution"
HTV = "https://fr.headtopics.com/news/dominique-de-villepin-devoile-son-programme-economique-pour-90197322"  # reprise de Capital, 26 nov. 2026
RUF = "https://www.lagazettefrance.fr/article/presidentielle-ruffin-renonce-le-paysage-se-clarifie-a-gauche"   # AFP, 21 nov. 2026
JDA = "https://www.journaldelagence.com/1414778-presidentielle-2027-quelles-sont-les-propositions-de-gabriel-attal-pour-le-logement"

def add(P, theme, texte, src, cle=False):
    if any(m["t"] == texte for m in M): return
    si = next((i for i, s in enumerate(S) if s["prog"] == P and s["section"] == theme), None)
    if si is None:
        S.append({"partie": "Propositions annoncées", "chapitre": theme, "section": theme, "intro": "", "url": src, "prog": P}); si = len(S) - 1
    n = sum(1 for m in M if m["s"] == si) + 1
    ids = {m["id"] for m in M}
    while f"{P.lower()}-{si}-{n}" in ids: n += 1
    M.append({"id": f"{P.lower()}-{si}-{n}", "s": si, "cle": cle, "t": texte, "sous": [], "page": None, "src": src})

# --- Édouard Philippe : programme « Croire en nous », volume 1 (142 propositions), présenté le 18 novembre 2026
P = PR["PHILIPPE"]
P["note"] = "Programme « Croire en nous » (volume 1, 142 propositions) présenté le 18 novembre 2026. Un volume 2 (culture, sport, santé, institutions) est annoncé pour début 2027."
P["eco"] = "Édouard Philippe vise un déficit public sous 2,5 % du PIB en 2032, avec une « double règle d'or » et une baisse « massive » des dépenses publiques, dont les dépenses sociales hors santé. Plan de redressement détaillé annoncé après le programme."
P["ecoUrl"] = LCPP
add("PHILIPPE", "Retraites", "Introduire une dose de capitalisation dans le système de retraite", PS)
add("PHILIPPE", "Retraites", "Après la réforme, confier le pilotage des retraites aux partenaires sociaux, avec une règle d'or d'équilibre", PS)
add("PHILIPPE", "Finances publiques", "Instaurer une « double règle d'or » obligeant le gouvernement et le Parlement à revenir vers l'équilibre budgétaire", PS, cle=True)
add("PHILIPPE", "Finances publiques", "Ramener le déficit public sous 2,5 % du PIB en 2032", LCPP)
add("PHILIPPE", "Travail et pouvoir d'achat", "Revenir sur les 35 heures", PS, cle=True)
add("PHILIPPE", "Travail et pouvoir d'achat", "Instaurer trois jours de carence pour tous les arrêts maladie, dans le public comme dans le privé", PS, cle=True)
add("PHILIPPE", "Chômage", "Réduire de 30 % le nombre d'allocataires du RSA", PS)
add("PHILIPPE", "Chômage", "Suspendre automatiquement le RSA des délinquants condamnés", LCPP)
add("PHILIPPE", "Économie", "Baisser de 50 milliards d'euros les impôts de production, financés par une baisse de 50 milliards d'euros des aides aux entreprises", PS, cle=True)
add("PHILIPPE", "Économie", "Supprimer l'objectif « zéro artificialisation nette » (ZAN)", PS)
add("PHILIPPE", "Énergie", "Construire 8 réacteurs nucléaires en plus des 6 déjà annoncés, soit 14 au total", PS, cle=True)
add("PHILIPPE", "Immigration", "Fixer des quotas d'immigration « choisie » pour la restauration, les hôpitaux et l'agriculture", PS)
add("PHILIPPE", "Immigration", "Instaurer un moratoire sur le regroupement familial", PS, cle=True)
add("PHILIPPE", "Sécurité et justice", "Autoriser la reconnaissance faciale, de façon ciblée et strictement encadrée", PS, cle=True)
add("PHILIPPE", "Sécurité et justice", "Utiliser la vidéoprotection assistée par l'IA pour identifier casseurs et criminels", PS)
add("PHILIPPE", "Sécurité et justice", "Rétablir les peines planchers", PS)
add("PHILIPPE", "Sécurité et justice", "Construire 30 000 places de prison supplémentaires", PS)
add("PHILIPPE", "Sécurité et justice", "Interdire aux magistrats de se syndiquer", PS)
add("PHILIPPE", "Éducation", "Donner plus d'autonomie aux établissements : rythmes, horaires, discipline, recrutement des équipes, choix de l'uniforme", PS, cle=True)
add("PHILIPPE", "Éducation", "Publier les évaluations de chaque établissement scolaire", PS)
add("PHILIPPE", "Éducation", "Réduire le nombre d'élèves par classe en maternelle et en primaire", PS)
add("PHILIPPE", "Éducation", "Recréer des écoles normales pour former les enseignants et reconnaître le métier d'AESH", PS)
add("PHILIPPE", "Enseignement supérieur", "Laisser les universités choisir leur mode de sélection des étudiants", PS)
add("PHILIPPE", "Enseignement supérieur", "Fermer les formations aux faibles taux de diplomation et d'insertion", PS)
add("PHILIPPE", "Logement", "Supprimer les frais de notaire pour le premier achat d'une résidence principale par les moins de 35 ans", PS, cle=True)

# --- nouveau candidat : Dominique de Villepin (candidature annoncée le 20 novembre 2026)
PR.setdefault("VILLEPIN", {"nom": "La France humaniste", "cand": "Dominique de Villepin", "long": "La France humaniste · Dominique de Villepin", "badge": "",
    "grad": ["#1d3557,#0b1a2e", "#264a73,#10233d"],
    "eco": "Dominique de Villepin vise un déficit public de 3 % du PIB en 2031, financé surtout par la suppression des niches fiscales et sociales et un « big bang » fiscal (neuf grands impôts, CSG à taux unique). Pas de chiffrage global détaillé publié.",
    "ecoUrl": LCPV,
    "note": "Candidature annoncée le 20 novembre 2026. Propositions issues de ses textes de 2026 et de sa déclaration de candidature : pas encore de programme complet chiffré."})
add("VILLEPIN", "Finances publiques", "Ramener le déficit public à 3 % du PIB d'ici 2031", PSV, cle=True)
add("VILLEPIN", "Finances publiques", "Supprimer progressivement toutes les niches fiscales et sociales par une « grande loi d'extinction » (« nouvelle nuit du 4 août »)", LCPV, cle=True)
add("VILLEPIN", "Fiscalité", "Simplifier le système fiscal autour de neuf grands impôts", LCPV)
add("VILLEPIN", "Fiscalité", "Rétablir un impôt sur la fortune, sous la forme d'un impôt unique sur toutes les formes de patrimoine", PSV, cle=True)
add("VILLEPIN", "Fiscalité", "Taxer plus fortement les successions, en exonérant totalement les transmissions faites de son vivant", LCPV)
add("VILLEPIN", "Fiscalité", "Basculer plus de 200 milliards d'euros de cotisations salariales et patronales vers une CSG à taux unique, élargie aux dépenses d'intelligence artificielle", LCPV, cle=True)
add("VILLEPIN", "Pouvoir d'achat", "Augmenter le salaire net d'environ 200 € par mois en moyenne en rapprochant le brut du net", HTV)
add("VILLEPIN", "Retraites", "Passer à une retraite par points où chacun choisit son âge de départ, la valeur du point étant fixée par les partenaires sociaux", GZV, cle=True)
add("VILLEPIN", "Retraites", "Préparer la réforme des retraites par une conférence sociale, une convention citoyenne et, si nécessaire, un référendum", GZV)
add("VILLEPIN", "Institutions", "Inscrire le principe de la négociation sociale dans la loi, voire dans la Constitution, via une « charte sociale »", GZV)
add("VILLEPIN", "Institutions", "Rompre avec l'« hyperprésidentialité » et relancer le référendum pour consulter directement les citoyens", PSV)
add("VILLEPIN", "Europe et défense", "Créer un Conseil de sécurité européen réunissant les cinq principaux pays européens, pour un « pacte de souveraineté »", PSV)

# --- Gabriel Attal : propositions sur le logement (presse, 17-25 novembre 2026)
add("ATTAL", "Logement", "Créer une banque nationale d'investissement pour le logement, qui financerait jusqu'à 50 % du prix d'achat en échange d'une part du bien", JDA, cle=True)
add("ATTAL", "Logement", "Faciliter l'achat de leur logement par les locataires du parc social", JDA)
add("ATTAL", "Logement", "Aligner la fiscalité des donations des grands-parents aux petits-enfants sur celle des parents aux enfants", JDA)
add("ATTAL", "Logement", "Créer un statut du bailleur privé et étendre la garantie Visale à tous les locataires", JDA)
add("ATTAL", "Logement", "Assouplir le « zéro artificialisation nette » et limiter les recours contre un permis de construire à un seul, jugé en 18 mois maximum", JDA)
add("ATTAL", "Logement", "Reconnaître un droit à la climatisation, notamment en copropriété", JDA)

# --- François Ruffin retire sa candidature (21 novembre 2026)
PR["RUFFIN"]["retrait"] = {"date": "2026-11-21", "texte": "Ne se présente plus : retrait annoncé le 21 novembre 2026, sans soutenir d'autre candidat.", "url": RUF}

# --- Marine Tondelier : candidature maintenue, mais vote des adhérents en décembre
PR["TONDELIER"]["note"] = "Candidature maintenue à ce jour. Le 18 novembre 2026, Marine Tondelier s'est dite prête à « travailler à une coalition » autour de Jean-Luc Mélenchon. Les adhérents votent du 10 au 13 décembre : candidature autonome, soutien à Mélenchon ou à Glucksmann. Positions recensées par France-Vote."

json.dump(x, open(F, "w"), ensure_ascii=False, indent=1)
print(len(PR), "candidats ;", len(M), "mesures")
