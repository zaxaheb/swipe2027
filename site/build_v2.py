# Version 2 (exploration UX, sans swipe) : construit v2.html à partir des mêmes données que index.html.
# Appelé à la fin de build.py. Le classement des mesures par sujet est automatique (mots-clés) : à relire.
import json, os, re, unicodedata

# Sujets communs à tous les candidats : (id, titre, description courte, mots-clés).
# Les mots-clés sont cherchés dans le texte de la mesure (poids 3), puis dans le titre de sa section (poids 1).
THEMES = [
    ("salaires", "Salaires et pouvoir d'achat", "Smic, prix, carburant, chèques",
     r"smic|salaire|pouvoir d.achat|prix|carburant|essence|inflation|cheque|blocage des prix|facture|revenu minimum|minima sociaux"),
    ("retraites", "Retraites", "Âge de départ, pensions, minimum vieillesse",
     r"retraite|pension|age legal|annuite|minimum vieillesse|depart a"),
    ("impots", "Impôts et budget", "Fiscalité, dette, déficit, dépenses publiques",
     r"impot|fiscal|taxe|\btva\b|flat tax|revenus du capital|isf|ifi|heritage|succession|dette|deficit|budget|depense(s)? publique|finances publiques|niche|evasion|cotisation|csg|contre-budget|milliard|md€|economies"),
    ("travail", "Travail et chômage", "Emploi, assurance chômage, temps de travail",
     r"chomage|emploi|travail|travailleur|salarie|35 heures|32 heures|temps de travail|licenci|france travail|apprenti|rsa|syndica|entreprise|tpe|pme|patron"),
    ("economie", "Économie et industrie", "Industrie, commerce, agriculture, numérique",
     r"industri|reindustri|economi|commerce|libre-echange|souverainete|banque|finance|bourse|numerique|intelligence artificielle|\bia\b|plateforme|agricult|agricole|paysan|alimentation|peche|autoroute|privatis|nationalis"),
    ("ecologie", "Écologie et énergie", "Climat, nucléaire, énergies, eau, biodiversité",
     r"climat|ecolog|energie|electricite|nucleaire|renouvelable|eolien|solaire|carbone|biodiversite|\beau\b|pollution|pesticide|glyphosate|animal|animaux|foret|bifurcation|planification|mer\b|ocean|transport|ferroviaire|train|velo"),
    ("sante", "Santé", "Hôpital, médecins, Sécurité sociale, fin de vie",
     r"sante|hopita|medecin|medic|soin|securite sociale|maladie|urgence|ehpad|dependance|handicap|fin de vie|euthanasie|psychiatr|pharmac|desert medical"),
    ("ecole", "École et jeunesse", "École, université, jeunes, formation",
     r"ecole|eleve|enseign|professeur|education|universit|etudiant|jeune|jeunesse|bac|lycee|college|formation|recherche|savoir|uniforme"),
    ("logement", "Logement", "Loyers, HLM, propriété, rénovation",
     r"logement|loyer|hlm|locataire|proprietaire|immobilier|renovation|sans-abri|expulsion|habitat|construction de"),
    ("securite", "Sécurité et justice", "Police, prisons, justice, drogue",
     r"police|policier|securite(?! sociale)|delinquan|prison|peine|justice|juge|tribunal|crime|criminel|drogue|narco|terroris|islamis|violence|gendarm|surete|videoprotection"),
    ("immigration", "Immigration", "Titres de séjour, asile, nationalité, frontières",
     r"immigr|migrant|etranger|asile|titre de sejour|nationalite|frontiere|regroupement familial|oqtf|clandestin|naturalisation|droit du sol|preference nationale|priorite nationale"),
    ("institutions", "Institutions et démocratie", "Référendum, Constitution, élections",
     r"referendum|constitution|6e republique|vie republique|assemblee|parlement|senat|election|proportionnelle|49\.3|president|democrat|ric\b|decentralis|collectivite|commune|laicite|corruption|elu"),
    ("europe", "Europe, monde et défense", "UE, diplomatie, armée, Ukraine, Gaza",
     r"europ|\bue\b|union europeenne|otan|defense|armee|militaire|guerre|paix|diplomat|international|ukraine|russie|israel|palestin|gaza|onu|traite|spatial|dissuasion|outre-mer|monde"),
    ("societe", "Société et familles", "Familles, égalité, discriminations, culture",
     r"famill|enfant|femme|egalite|discrimin|racisme|lgbt|handicap|culture|sport|audiovisuel|media|presse|associati|solidarit|pauvrete|aides sociales|allocation|natalite|parent|droits nouveaux|liberte"),
]
THEME_IDS = [t[0] for t in THEMES]

def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("’", "'")

RX = {tid: re.compile(kw) for tid, _, _, kw in THEMES}

def theme_of(text, section, extra="", w_sec=1):
    """Texte de la mesure (poids 3), titre de section (poids w_sec : 4 quand la section est déjà un sujet), résumé de la fiche (poids 1)."""
    t, sct, ex = norm(text), norm(section), norm(extra)
    if re.match(r"(contre-budget|annonces|propositions annoncees|methode|mesure \d)", sct): sct = ""   # sections qui ne sont pas des sujets
    best, score = None, 0
    for tid in THEME_IDS:
        sc = 3 * len(RX[tid].findall(t)) + w_sec * len(RX[tid].findall(sct)) + len(RX[tid].findall(ex))
        if sc > score: best, score = tid, sc
    return best or "societe"

LFI_RN = {
    "LFI": {"nom": "LFI", "cand": "Jean-Luc Mélenchon", "long": "La France insoumise · L'Avenir en commun", "color": "#2f7d5b",
            "eco": "Pour tout son programme, LFI annonce 106,4 Md€ de recettes nouvelles et 81,7 Md€ de dépenses nouvelles en 2027, sans chiffrage mesure par mesure.",
            "ecoUrl": "https://www.lavenirencommun.org/financement/", "complet": True},
    "RN": {"nom": "RN", "cand": "Marine Le Pen", "long": "Rassemblement national", "color": "#1f3a9e",
           "note": "Candidature annoncée le 7 juillet 2026. Son éligibilité dépend de l'issue de son pourvoi en cassation. Le programme 2027 complet n'est pas encore publié.",
           "eco": "Le contre-budget RN (6 oct. 2026) annonce 140 Md€ d'économies nettes d'ici 2032 et 30 Md€ de baisses d'impôts. L'Institut de l'Entreprise juge environ 7,5 Md€ de ces économies crédibles."},
}

def load_sorting(H):
    """data/sujets_taxonomie.json (sujets et points) + data/sujets.json (classement de chaque mesure), s'ils existent."""
    D = os.path.join(H, "..", "data")
    tx, cl = os.path.join(D, "sujets_taxonomie.json"), os.path.join(D, "sujets.json")
    if not (os.path.exists(tx) and os.path.exists(cl)): return None, None
    return json.load(open(tx))["sujets"], json.load(open(cl))["mesures"]

def build(H, progs, S, Mz, fi):
    TX, CL = load_sorting(H)
    cands = dict(LFI_RN)
    for k, x in progs.items():
        c = {f: x.get(f) for f in ("nom", "cand", "long", "note", "eco", "ecoUrl") if x.get(f)}
        c["color"] = (x.get("grad") or ["#555555,#222222"])[0].split(",")[0]
        if x.get("retrait"): c["retrait"] = x["retrait"].get("texte", "retiré")
        cands[k] = c
    mes = []
    for m in Mz:
        s = S[m["s"]]
        txt = m["t"] + (" " + " ".join(m["sous"]) if m["sous"] else "")
        x = {"id": m["id"], "P": s["prog"], "t": m["t"], "sous": m["sous"], "cle": bool(m.get("cle")), "sec": s["section"], "url": m.get("src") or s["url"]}
        c = CL.get(m["id"]) if CL else None
        if c: x["th"], x["pt"] = c[0], c[1]
        else: x["th"] = theme_of(txt, s["section"] + " " + s.get("chapitre", ""), fi.get(m["id"], {}).get("resume") or "", 1 if s["prog"] == "LFI" else 4)
        mes.append(x)
    count = {k: sum(1 for m in mes if m["P"] == k) for k in cands}
    for k in cands: cands[k]["n"] = count[k]
    cands = {k: v for k, v in cands.items() if v["n"]}
    themes = [{"id": x["id"], "t": x["t"], "d": x["d"], "pts": [[p["id"], p["t"]] for p in x["points"]]} for x in TX] if TX else [{"id": tid, "t": t, "d": d} for tid, t, d, _ in THEMES]
    if CL: print("v2 : classement par sujet et point depuis data/sujets.json (" + str(sum(1 for m in mes if "pt" in m)) + "/" + str(len(mes)) + " mesures)")
    data = {"cands": cands, "themes": themes, "mes": mes, "fiches": fi}
    J = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    h = open(os.path.join(H, "template_v2.html")).read().replace("/*__DATA__*/null", J)
    open(os.path.join(H, "v2.html"), "w").write(h)
    by = {}
    for m in mes: by.setdefault(m["th"], {}).setdefault(m["P"], 0); by[m["th"]][m["P"]] += 1
    print("v2.html", len(h), "|", ", ".join(f"{t['id']}:{sum(by.get(t['id'], {}).values())}/{len(by.get(t['id'], {}))}c" for t in themes))
