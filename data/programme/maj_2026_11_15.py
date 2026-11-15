# Mise à jour des candidats et mesures, actualité du 9 au 15 novembre 2026.
# Idempotent : relancer ne crée pas de doublon. Usage : python3 maj_2026_11_15.py
import json
F = "autres_candidats.json"
x = json.load(open(F))
S, M, PR = x["sections"], x["mesures"], x["progs"]

QZ = "https://fr.qz.com/eric-zemmour-800000-postes-fonction-publique-111226"            # franceinfo « Nos services publics », 12 nov. 2026
PM = "https://www.politiquematin.fr/zemmour-presidentielle-2027-confirme-candidature-tf1-programme-101126-2055"  # Zemmour sur TF1, 10 nov. 2026
TA = "https://touch-actu.fr/actualites/portraits-politiques-8889-teddy-riner-candidat-a-la-presidentielle-2027-programme-reactions-et-parrainages"
EL = "https://elections2027.com/article/2026-10-22-cazeneuve-charge-emmanuel-macron-et-appuie-raphael-glucksmann"

def add(P, theme, texte, src, cle=False):
    if any(m["t"] == texte for m in M): return
    si = next((i for i, s in enumerate(S) if s["prog"] == P and s["section"] == theme), None)
    if si is None:
        S.append({"partie": "Propositions annoncées", "chapitre": theme, "section": theme, "intro": "", "url": src, "prog": P}); si = len(S) - 1
    n = sum(1 for m in M if m["s"] == si) + 1
    M.append({"id": f"{P.lower()}-{si}-{n}", "s": si, "cle": cle, "t": texte, "sous": [], "page": None, "src": src})

# --- nouveau candidat : Teddy Riner (annonce le 9 novembre 2026)
PR.setdefault("RINER", {"nom": "La France qu'on veut", "cand": "Teddy Riner", "long": "« La France qu'on veut » · Teddy Riner (sans parti)", "badge": "",
    "grad": ["#3a3f47,#15181c", "#4a5059,#1c1f24"], "eco": "Pas encore de chiffrage publié : orientations générales (dette, pouvoir d'achat).", "ecoUrl": TA,
    "note": "Candidature annoncée le 9 novembre 2026, « ni de droite, ni de gauche ». Orientations générales pour l'instant, sans programme détaillé ni chiffré."})
add("RINER", "Retraites", "Réformer les retraites en tenant compte de la démographie et de la pénibilité, en gardant la répartition (une part de capitalisation n'est pas exclue)", TA)
add("RINER", "Pouvoir d'achat", "Augmenter le salaire net en baissant les cotisations sociales", TA)

# --- Éric Zemmour : TF1 (10 nov.) et franceinfo (12 nov.)
add("ZEMMOUR", "Immigration", "Réduire de deux millions le nombre d'immigrés en France sur le quinquennat", PM, cle=True)
add("ZEMMOUR", "Immigration", "Expulser les étrangers condamnés ou détenus", PM)
add("ZEMMOUR", "Immigration", "Expulser les étrangers au chômage depuis plus de six mois, y compris en situation régulière", PM)
add("ZEMMOUR", "Finances publiques", "Un plan de redressement des finances publiques de 280 milliards d'euros, mêlant baisses de dépenses et baisses d'impôts", PM, cle=True)
add("ZEMMOUR", "Fonction publique", "Ne pas remplacer 800 000 fonctionnaires partant à la retraite, en sanctuarisant 2,2 millions de postes (enseignants, militaires, policiers, soignants)", QZ, cle=True)
add("ZEMMOUR", "Santé", "Faire revenir 100 000 médecins retraités, avec des revenus exonérés d'impôt sur le revenu, et supprimer le numerus clausus", QZ)
add("ZEMMOUR", "Justice", "Recruter 40 000 surveillants pénitentiaires et cumuler les peines au lieu de les confondre", QZ)

# --- fonction publique (franceinfo « Nos services publics », 12 nov.)
add("RETAILLEAU", "Fonction publique", "Ne pas remplacer 400 000 postes de fonctionnaires sur le quinquennat", QZ, cle=True)
add("ATTAL", "Fonction publique", "Un plan de départs volontaires de 100 000 postes dans la fonction publique", QZ)
add("ROUSSEL", "Fonction publique", "Recruter 500 000 personnes dans les services publics", QZ, cle=True)

# --- Bernard Cazeneuve ne se présente plus : il soutient Raphaël Glucksmann depuis le 22 octobre 2026
PR["CAZENEUVE"]["retrait"] = {"date": "2026-10-22", "texte": "Ne se présente plus : soutient Raphaël Glucksmann depuis le 22 octobre 2026.", "url": EL}

json.dump(x, open(F, "w"), ensure_ascii=False, indent=1)
print(len(PR), "candidats ;", len(M), "mesures")
