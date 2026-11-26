# Mise à jour des candidats et mesures, actualité du 16 au 26 novembre 2026.
# Sources principales : sites officiels (edouardphilippe.fr/programme, lafrancehumaniste.fr/programme).
# Idempotent : relancer ne crée pas de doublon. Usage : python3 maj_2026_11_26.py
import json
F = "autres_candidats.json"
x = json.load(open(F))
S, M, PR = x["sections"], x["mesures"], x["progs"]

def add(P, theme, texte, src, cle=False):
    if any(m["t"] == texte for m in M): return
    si = next((i for i, s in enumerate(S) if s["prog"] == P and s["section"] == theme), None)
    if si is None:
        S.append({"partie": "Propositions annoncées", "chapitre": theme, "section": theme, "intro": "", "url": src, "prog": P}); si = len(S) - 1
    n = sum(1 for m in M if m["s"] == si) + 1
    ids = {m["id"] for m in M}
    while f"{P.lower()}-{si}-{n}" in ids: n += 1
    M.append({"id": f"{P.lower()}-{si}-{n}", "s": si, "cle": cle, "t": texte, "sous": [], "page": None, "src": src})

def lot(P, theme, src, items):
    for t in items:
        cle = t.startswith("!")
        add(P, theme, t.lstrip("!"), src, cle)

# ======================================================================
# Édouard Philippe : programme officiel « Croire en nous » (volume 1), présenté le 18 novembre 2026
EP = "https://www.edouardphilippe.fr/programme/"
P = PR["PHILIPPE"]
P["note"] = "Programme « Croire en nous » (volume 1, 142 propositions) présenté le 18 novembre 2026, détaillé sur son site en 17 thèmes. Un volume 2 (culture, sport, santé, institutions) est annoncé pour début 2027."
P["eco"] = "Édouard Philippe vise un déficit public sous 2,5 % du PIB en fin de quinquennat, soit près de 150 milliards d'euros d'économies : moitié sur les dépenses sociales, un quart sur l'État et les collectivités, un quart sur la croissance. Règle d'or constitutionnelle et aucun nouvel impôt pendant cinq ans."
P["ecoUrl"] = EP + "comptes-publics"
lot("PHILIPPE", "Sécurité", EP + "securite", [
 "!Instaurer un « état d'urgence narco » donnant des moyens exceptionnels dans les zones les plus touchées par le narcotrafic, jusqu'à l'usage ciblé de la reconnaissance faciale",
 "Utiliser la vidéoprotection avec intelligence artificielle pour identifier les casseurs et les criminels",
 "Saisir l'argent et les biens des trafiquants (« fiche S financière ») et alourdir les amendes des consommateurs de drogue",
 "!Donner aux maires un pouvoir de sanction renforcé contre les incivilités du quotidien",
 "!Prélever les amendes impayées directement sur les aides sociales",
 "Suspendre automatiquement le RSA des délinquants condamnés, sauf décision contraire du maire",
 "Appliquer aux casseurs les mêmes mesures de prévention que contre le terrorisme : fichier dédié, visites domiciliaires, contrôle administratif",
 "Mener des opérations « place nette » contre la drogue dans les boîtes de nuit et les festivals",
 "Combattre l'islamisme et éradiquer les Frères musulmans et les organisations qui y sont affiliées",
])
lot("PHILIPPE", "Justice", EP + "justice", [
 "!Rétablir les peines planchers",
 "!Prononcer des peines de prison courtes dès la première infraction",
 "Supprimer le juge d'application des peines : une peine prononcée serait une peine exécutée",
 "Construire 30 000 places de prison pour les peines courtes, avec une loi d'accélération des prisons",
 "Rétablir les juges de paix pour une justice civile plus rapide et plus proche",
 "Interdire aux magistrats de se syndiquer",
 "Refondre le code de procédure pénale en 100 jours et utiliser l'IA pour accélérer l'instruction des dossiers",
 "Instaurer des peines minimales pour les violences graves contre les policiers, les élus et les enseignants",
 "Lever l'excuse de minorité et permettre la comparution immédiate des mineurs pour les faits de narcotrafic",
 "Permettre au garde des Sceaux d'adresser des instructions individuelles écrites aux procureurs",
 "Permettre aux justiciables de saisir directement le Conseil supérieur de la magistrature",
])
lot("PHILIPPE", "Immigration", EP + "immigration", [
 "Instaurer des quotas pour choisir l'immigration de travail",
 "!Suspendre le regroupement familial pendant tout le quinquennat",
 "Utiliser des « centres de retour » à l'étranger pour éloigner les étrangers en situation irrégulière",
 "!Dénoncer l'accord franco-algérien de 1968",
 "Rétablir la double peine : un étranger qui commet un délit serait expulsé et perdrait ses aides sociales",
 "Mettre fin à toute acquisition automatique de la nationalité française",
 "Faire voter chaque année par le Parlement la liste des pays sûrs et supprimer l'asile à vie",
 "Aligner les aides sociales versées aux étrangers sur la moyenne européenne",
 "Vérifier les ressources des étudiants étrangers et appliquer la hausse des frais d'inscription hors Union européenne",
 "Créer un régime européen de sanctions contre les passeurs : gel des avoirs et interdiction de territoire",
])
lot("PHILIPPE", "Défense", EP + "defense", [
 "!Adopter une loi de « massification » des armées : plus de soldats, de réservistes, de munitions et de drones",
 "!Rétablir un service national obligatoire et universel, avec une option militaire et plusieurs options civiles",
 "Passer de 45 000 à 250 000 réservistes",
 "Consacrer au moins 1 % du PIB des pays de l'Union européenne à des armements fabriqués en Europe",
 "Soutenir pleinement l'Ukraine, qui a vocation à intégrer l'OTAN",
 "Moderniser la dissuasion nucléaire",
 "Construire en France des avions bombardiers d'eau (« Canadairs ») contre les incendies",
])
lot("PHILIPPE", "Travail et pouvoir d'achat", EP + "travail", [
 "!Laisser chaque entreprise fixer sa durée du travail par accord : fin du caractère obligatoire des 35 heures",
 "Supprimer les cotisations patronales au-delà de la 37e heure",
 "!Instaurer trois jours de carence pour tous les arrêts maladie, dans le privé comme dans le public",
 "Augmenter le salaire net grâce aux économies sur la dépense sociale (retraites, chômage, arrêts maladie)",
 "Développer l'apprentissage",
 "Imposer un délai de 3 à 6 mois entre un arrêt maladie et une rupture conventionnelle",
 "Créer un droit à la reconversion pour les salariés dont le métier est menacé par l'IA",
 "Mieux former, recruter et accompagner les salariés de plus de 50 ans, et développer retraite progressive et cumul emploi-retraite",
])
lot("PHILIPPE", "Entreprises et industrie", EP + "entreprises", [
 "!Baisser de 50 milliards d'euros les impôts de production, financés par 50 milliards d'euros d'aides aux entreprises en moins",
 "Ne créer aucune nouvelle norme pendant le quinquennat et en finir avec la surtransposition des règles européennes",
 "Créer un « livret Capital France » et des fonds de capitalisation pour orienter l'épargne vers les entreprises françaises",
 "Protéger le marché européen face à la concurrence chinoise : transferts de technologie, quotas de production et coentreprises imposés",
 "Achever le marché unique européen et l'Union des marchés de capitaux",
 "Supprimer la Commission nationale du débat public (CNDP) et diviser par deux les délais des projets",
 "Créer un « super Dutreil agricole » pour défiscaliser la transmission des exploitations",
 "Remplacer les négociations commerciales annuelles par des accords pluriannuels",
 "Créer 100 « territoires de souveraineté alimentaire »",
])
lot("PHILIPPE", "Finances publiques", EP + "comptes-publics", [
 "!Inscrire une règle d'or budgétaire dans la Constitution, adoptée par référendum dès le début du quinquennat",
 "!Ramener le déficit public sous 2,5 % du PIB d'ici la fin du quinquennat, soit près de 150 milliards d'euros d'économies",
 "!Ne créer aucun nouvel impôt pendant cinq ans",
 "Fusionner, supprimer ou privatiser une trentaine d'agences et d'opérateurs de l'État, dont France Travail (privatisé) et le CESE (supprimé)",
 "Réduire de 30 % le nombre d'allocataires du RSA par un suivi renforcé, l'orientation vers les métiers en tension et la lutte contre les abus",
 "Ne pas réduire les dépenses de santé, mais mieux les dépenser (prévention, technologies)",
])
lot("PHILIPPE", "Retraites", EP + "retraites", [
 "!Généraliser la capitalisation collective à tous les salariés et ouvrir un plan d'épargne retraite à chaque Français",
 "Verser 500 € de l'État sur un plan d'épargne retraite pour chaque Français dès son premier emploi",
 "Confier la gestion des retraites aux partenaires sociaux une fois le système revenu à l'équilibre",
 "Ne pas augmenter les cotisations retraite ni baisser les pensions",
 "Maintenir les départs anticipés : 55 ans pour les personnes handicapées, 60 ans en cas d'incapacité permanente, 62 ans en cas d'invalidité, carrières longues",
])
lot("PHILIPPE", "Éducation", EP + "ecole", [
 "!Créer un statut d'« école publique autonome » : méthodes, horaires, organisation, uniforme et participation au recrutement des équipes",
 "Ouvrir un soutien scolaire universel, avec d'anciens professeurs, des étudiants volontaires et un assistant IA",
 "Réduire la taille des classes en maternelle et en primaire",
 "Apprendre à lire dès la maternelle et recentrer le primaire sur lire, écrire, compter",
 "Recréer des écoles normales et ouvrir le métier d'enseignant à des professionnels extérieurs",
 "Interdire le téléphone portable à l'école, au collège et au lycée, avec confiscation immédiate",
 "Aucune IA à l'école avant le collège, puis une intégration progressive au lycée",
 "!Créer une « amende de responsabilisation scolaire » pour les parents d'enfants harceleurs, perturbateurs ou absentéistes",
 "Publier les évaluations de chaque établissement auprès des parents et des élus",
 "Faire compter les notes de juin dans le bulletin de l'année suivante",
 "Assumer la sélection à l'université et fermer les formations aux faibles taux de diplomation et d'insertion",
 "Former 100 000 ingénieurs par an d'ici cinq ans, contre 40 000 aujourd'hui",
 "Reconnaître le métier d'AESH (accompagnant d'élèves en situation de handicap)",
])
lot("PHILIPPE", "Familles", EP + "famille", [
 "!Permettre un temps partiel parental payé à 100 % pour un travail à 80 %, pendant deux mois après le congé parental",
 "Lancer un « plan Marshall » pour la garde d'enfants",
 "Doubler les plafonds de donation du vivant aux enfants et petits-enfants pendant les trois premières années du quinquennat",
])
lot("PHILIPPE", "Protection de l'enfance", EP + "protection-de-l-enfance", [
 "!Créer un « droit de savoir » : les parents pourraient faire vérifier par la police les antécédents d'un adulte proche de leur enfant",
 "!Rendre imprescriptibles les crimes commis sur des mineurs",
 "Écarter immédiatement un adulte visé par une plainte concernant un enfant, sans attendre la fin de l'enquête",
 "Contrôler tous les lieux d'accueil d'enfants au moins tous les 3 ans, contre 6 aujourd'hui, avec pouvoir de fermeture",
 "Vérifier les antécédents de tous les adultes qui encadrent des enfants (certificats d'honorabilité)",
 "Renforcer la responsabilité pénale des plateformes pour les contenus pédopornographiques",
 "Réécrire la loi d'interdiction des réseaux sociaux aux moins de 15 ans avec un groupe transpartisan",
])
lot("PHILIPPE", "Logement", EP + "logement", [
 "!Construire 4 millions de logements en dix ans, soit 400 000 par an",
 "!Supprimer les « frais de notaire » pour le premier achat des moins de 35 ans",
 "Instaurer un moratoire de cinq ans sur les normes de construction et d'habitation",
 "Affecter aux maires la TVA sur les logements neufs de leur commune",
 "Appliquer un prélèvement forfaitaire unique aux revenus de la location longue durée",
 "Supprimer l'IFI sur les logements loués en longue durée",
 "!Geler pendant le quinquennat les paliers de la RE2020 et l'interdiction de louer les passoires thermiques",
 "Laisser les maires décider d'encadrer ou non les loyers et attribuer les logements sociaux",
 "Appliquer des surloyers aux locataires du parc social qui dépassent les plafonds de revenus",
 "Permettre aux préfets d'expulser un locataire HLM condamné pour des troubles graves et répétés à l'ordre public",
])
lot("PHILIPPE", "Handicap", EP + "handicap", [
 "!Garantir une solution d'accompagnement à chaque enfant et adulte handicapé, avec une loi sur l'école inclusive",
 "Garantir 15 jours de répit par an aux proches aidants les plus mobilisés",
 "Permettre le cumul intégral de l'AAH et d'un salaire pendant un an après une reprise d'emploi, contre 6 mois aujourd'hui",
 "Imposer à la MDPH une première réponse sous 2 mois et une décision définitive sous 3 mois",
 "Créer 100 000 places en habitat partagé et inclusif d'ici 2035",
])
lot("PHILIPPE", "Intelligence artificielle", EP + "intelligence-artificielle", [
 "Instaurer une préférence européenne dans les achats technologiques (« Buy European Tech Act »)",
 "!Créer des « zones d'accélération de l'IA » pour faire de la France le leader européen des data centers",
 "Lancer un grand plan de transformation des services publics par l'IA",
 "Lancer un plan « Horizon 2050 » pour succéder à France 2030 : un euro public pour un euro privé",
 "Créer un « bouclier cyber » et lutter contre la désinformation et les ingérences étrangères",
])
lot("PHILIPPE", "Énergie", EP + "energie", [
 "!Lancer 8 EPR en plus des 6 déjà prévus, soit 14 nouveaux réacteurs nucléaires",
 "Porter la part du fret ferroviaire à 20 % d'ici la fin du quinquennat, contre moins de 10 % aujourd'hui",
 "Verser la même aide à l'achat d'une voiture électrique d'occasion que pour une neuve",
 "Lancer un plan « Messmer » de la géothermie et du biométhane avec les collectivités et les agriculteurs",
 "Renforcer le prix du carbone aux frontières européennes",
])
lot("PHILIPPE", "Climat", EP + "adaptation-climatique", [
 "Climatiser massivement les lieux accueillant des personnes fragiles et rafraîchir Ehpad et logements sociaux par des réseaux de froid",
 "Réutiliser 10 % des eaux usées traitées, contre moins de 1 % aujourd'hui",
 "Accélérer le stockage de l'eau agricole",
 "Ne plus ajouter de règles françaises aux normes européennes en agriculture (« zéro surtransposition »)",
 "Lancer un plan national pour rendre les rivières baignables",
])
lot("PHILIPPE", "Outre-mer", EP + "outre-mer", [
 "!Instaurer un moratoire total sur l'immigration à Mayotte pendant le quinquennat, immigration familiale comprise",
 "Suspendre l'enregistrement des demandes d'asile à Mayotte et en Guyane pendant le quinquennat",
 "Suspendre le droit du sol à Mayotte pendant plusieurs années",
 "Construire une nouvelle piste d'aéroport sur Grande-Terre et un deuxième hôpital à Mayotte",
 "Moderniser l'octroi de mer et ouvrir les transports à la concurrence contre la vie chère",
 "Faire converger le Smic et les retraites de Mayotte vers le niveau de l'Hexagone",
 "Doubler le nombre de navires de la Marine aux Antilles contre le narcotrafic",
])

# ======================================================================
# Dominique de Villepin : programme « Réussir à nouveau » (258 propositions), La France humaniste
VC = "https://lafrancehumaniste.fr/programme/reussir-a-nouveau/chapitre-%d.html"
PR.setdefault("VILLEPIN", {"nom": "La France humaniste", "cand": "Dominique de Villepin", "long": "La France humaniste · Dominique de Villepin", "badge": "",
    "grad": ["#1d3557,#0b1a2e", "#264a73,#10233d"], "eco": "", "ecoUrl": "", "note": ""})
V = PR["VILLEPIN"]
V["eco"] = "Dominique de Villepin vise un déficit public de 2,9 % du PIB en 2031 (croissance supposée de 0,8 %), financé surtout par l'extinction des niches fiscales et sociales (environ 35 Md€ par an) et un « big bang » fiscal : neuf impôts, ISF rétabli, CSG élargie."
V["ecoUrl"] = VC % 1
V["note"] = "Candidature annoncée le 20 novembre 2026. Programme « Réussir à nouveau » : 258 propositions publiées sur le site de La France humaniste."
def vl(ch, theme, items): lot("VILLEPIN", theme, VC % ch, items)

vl(1, "Finances publiques", [
 "!Inscrire dans une loi organique une trajectoire des déficits sur cinq ans, contrôlée par le Conseil constitutionnel",
 "!Ramener le déficit public à 2,9 % du PIB en 2031",
 "Créer une commission d'enquête sur la dégradation des comptes publics depuis dix ans",
 "Mesurer l'impact social des lois de finances, décile par décile",
])
vl(1, "Écologie", [
 "Encadrer le prix du carbone : carburant plafonné à 2,50 € le litre, gaz encadré",
 "Inscrire dans la Constitution la neutralité carbone en 2050 (2 tonnes de CO2 par habitant)",
 "Produire une électricité abondante et décarbonée : poursuivre les six EPR2 et évaluer les coûts avant d'aller plus loin",
 "Faire publier la trajectoire carbone nationale par le Haut Conseil des finances publiques",
 "Financer la décarbonation à environ 200 € la tonne évitée, soit environ 4,5 milliards d'euros de plus par an",
])
vl(1, "Fiscalité", [
 "!Exonérer les héritages jusqu'à 1 million d'euros en ligne directe, avec des taux de 50 à 60 % au-delà de 5 millions, versés sur des comptes pour chaque naissance",
 "!Rétablir l'impôt sur la fortune (barème proche de 2016) dans un impôt unique sur le patrimoine des 1 % les plus riches, hors biens professionnels",
])
vl(2, "Institutions", [
 "Créer quatre conseils présidentiels réguliers : territoires, outre-mer, intelligence artificielle et sécurité nationale",
 "Étendre le domaine réservé du Président à l'outre-mer, à la culture et à l'IA",
 "Lancer cinq chantiers présidentiels pilotés par l'Élysée : pauvreté, savoirs fondamentaux, violences faites aux femmes et aux enfants, morts au travail, biodiversité",
 "Nommer un gouvernement provisoire resserré dès la passation de pouvoir",
 "Réunir le Parlement en Congrès puis laisser 15 jours aux blocs pour former un gouvernement de compromis, avant une dissolution en cas d'échec",
 "!Organiser des référendums réguliers, chacun précédé d'un an de débat avec experts, convention citoyenne et conférence sociale",
])
vl(3, "Justice", [
 "Recruter des magistrats pour rattraper en dix ans la moyenne européenne, et des juges de paix bénévoles",
 "Simplifier le code de procédure pénale",
 "Relever les plafonds et le barème de l'aide juridictionnelle",
 "Juger toutes les affaires de viol devant des cours d'assises avec jurés populaires",
 "Ajouter un juge professionnel aux prud'hommes",
 "Créer une juridiction des biens communs (eau, air, sol, vivant)",
 "!Élire un Procureur général de la Nation, indépendant de l'exécutif, pour six ans",
 "Fixer comme priorités pénales les violences sexuelles, le narcotrafic, la délinquance des mineurs et la corruption",
 "Créer un secrétariat d'État à la Police judiciaire",
 "Créer un répertoire central des travaux d'intérêt général pour une affectation dès l'audience",
 "Mettre fin aux peines non exécutées : incarcérations courtes systématiques, semi-liberté, bracelet électronique",
 "Créer une commission de sages, sur le modèle Stasi, contre l'antisémitisme, le racisme et l'islamophobie",
 "Donner au Défenseur des droits un pouvoir de sanction financière contre les discriminations",
 "Rendre le CV anonyme obligatoire dans les entreprises de plus de 50 salariés",
])
vl(3, "Médias", [
 "Permettre à l'Arcom de suspendre des contenus et rendre les plateformes responsables comme des éditeurs",
 "Encadrer par contrat les relations entre l'Élysée et les journalistes accrédités",
 "Réorienter les aides à la presse vers l'information plutôt que l'opinion, via une commission citoyenne",
 "Revoir les seuils de concentration des médias",
 "Financer l'audiovisuel public par une part fixe de 4 % de l'impôt sur le revenu",
 "Créer une commission citoyenne permanente d'audit éditorial de l'audiovisuel public",
])
vl(3, "Sécurité", [
 "Renforcer les polices municipales par des contrats locaux pluriannuels entre l'État et les collectivités",
])
vl(4, "Intelligence artificielle", [
 "!Créer un consortium européen d'IA souveraine, sûre et sobre, doté d'1 milliard d'euros par État membre au départ",
 "Faire du quantique un pilier de souveraineté, avec des achats européens groupés de semi-conducteurs",
 "Créer une autorité de sûreté de l'IA, avec évaluation indépendante des modèles avant leur mise en service",
 "Obliger à afficher le coût énergétique des requêtes d'IA (tokens) auprès des consommateurs",
 "Soumettre les modèles d'IA non européens au mécanisme d'ajustement carbone aux frontières",
 "Lancer un plan de simplification des démarches administratives grâce à l'IA",
 "Obliger les fournisseurs d'IA à offrir à chacun un forfait gratuit de requêtes (tokens)",
 "Former massivement les agents publics à l'IA",
])
vl(5, "Fiscalité", [
 "!Supprimer toutes les niches fiscales et sociales en cinq ans par une « loi d'extinction » (environ 35 milliards d'euros par an)",
 "!Passer de plus de 400 taxes à neuf impôts, avec une CSG élargie aux dépenses d'IA",
 "Réécrire les codes de l'environnement, de l'urbanisme et du travail en divisant leur volume par quatre (« méthode Code Napoléon »)",
])
vl(6, "Défense", [
 "Préparer une loi de programmation militaire 2031-2036 visant 3,5 % du PIB pour la défense",
 "Consolider les filières de défense (IA, biotechnologies, drones) et financer des champions européens",
 "Porter le service militaire volontaire de 1 600 à 5 000 places et développer les réserves",
])
vl(6, "Immigration", [
 "Négocier des accords bilatéraux pour augmenter les réadmissions de personnes sous OQTF",
 "Spécialiser la moitié des centres de rétention pour les personnes sous OQTF qui troublent l'ordre public",
 "Rendre obligatoire l'enregistrement biométrique des étrangers sans titre de séjour",
 "!Voter une loi de programmation pluriannuelle de l'immigration après un an de concertation",
 "Créer une autorité indépendante de l'information sur les migrations",
 "Créer un secrétariat général à l'intégration auprès du Premier ministre",
 "Décentraliser l'intégration au niveau du département et renforcer l'apprentissage du français",
])
vl(6, "Fonction publique", [
 "Rétablir l'ENA et ouvrir socialement les concours de catégorie A",
 "Créer un corps d'ingénieurs chargés de l'IA dans les administrations",
 "Créer une inspection générale interministérielle indépendante",
 "Stabiliser les effectifs des trois fonctions publiques et réindexer le point d'indice sur l'inflation",
 "Donner à la HATVP un pouvoir de sanction sur les mobilités irrégulières",
 "Sanctionner pénalement l'entreprise qui recrute illégalement un agent public",
])
vl(7, "Sécurité", [
 "Créer environ 75 brigades spécialisées (1 000 fonctionnaires) dans les territoires touchés par le narcotrafic",
 "!Créer une agence de renseignement contre le narcotrafic, sur le modèle de la DEA américaine",
 "!Voter une loi de programmation de 3 milliards d'euros par an contre les violences faites aux femmes et aux enfants",
 "Créer un parquet national contre les violences faites aux femmes et aux enfants",
 "Rendre obligatoire un contrat local de sécurité piloté par le maire et le préfet",
 "Créer 5 000 places supplémentaires en EPIDE",
 "Créer 15 000 places dans des structures éducatives fermées pour les primo-délinquants",
 "Doubler le nombre de médiateurs sociaux dans les quartiers prioritaires",
])
vl(8, "Institutions", [
 "!Créer un référendum d'initiative citoyenne contraignant, déclenché par une pétition de 5 millions de signatures",
 "!Abaisser le droit de vote à 16 ans",
 "Rendre le vote obligatoire, sans sanction, et reconnaître le vote blanc : à 50 %, l'élection serait refaite",
])
vl(8, "Territoires", [
 "Affecter aux collectivités une nouvelle taxe sur le foncier nu, dont elles fixeraient le taux",
 "Nommer un délégué de l'État par commune (« sous-préfet aux champs »), avec un contrôle a posteriori",
 "Créer un Conseil des communes mensuel avec l'Élysée",
 "Confier aux régions l'aménagement du territoire, avec une DATAR régionale",
 "Jumeler communes urbaines et communes rurales",
])
vl(9, "Outre-mer", [
 "Voter une loi-programme de 15 ans pour le développement des outre-mer",
 "Nommer un secrétaire général aux outre-mer à l'Élysée",
 "Créer trois préfets maritimes outre-mer contre les trafics de drogue et l'immigration illégale",
 "Permettre des évolutions institutionnelles, jusqu'à l'autonomie, si les populations le souhaitent",
 "Retrouver le consensus en Nouvelle-Calédonie, l'État jouant un rôle neutre de facilitateur",
])
vl(10, "Europe et international", [
 "!Créer un Conseil de sécurité européen de cinq États (dont l'Allemagne, l'Espagne, l'Italie et la Pologne) dans un « pacte de souveraineté »",
 "Créer un pilier européen de défense au sein de l'OTAN, avec un état-major européen",
 "Créer une « DARPA » européenne pour l'innovation de défense (IA, drones, quantique, spatial)",
 "Élargir progressivement la taxe carbone aux frontières de l'Union européenne",
 "Adopter un « Buy European Act » pour la commande publique",
 "Créer un statut européen de l'artiste avec portabilité des droits sociaux",
])
vl(11, "Europe et international", [
 "Proposer un traité universel de sécurité de l'IA et une agence internationale sur le modèle de l'AIEA",
 "Lancer une déclaration universelle des droits cognitifs en 2028",
 "Créer une organisation internationale fixant des niveaux annuels de production d'énergies fossiles compatibles avec 1,5 à 2 °C",
 "Interdire la militarisation et l'appropriation de l'espace",
 "Organiser dès 2027 une conférence pour la paix en Palestine et conditionner l'accord UE-Israël à des progrès concrets",
 "Pérenniser le soutien à l'Ukraine et ouvrir une adhésion graduelle à l'Union européenne",
 "Porter une interdiction internationale des armes létales autonomes",
 "Accueillir une conférence internationale sur les violences faites aux femmes et aux enfants",
 "Porter l'aide au développement à 0,7 % du PIB",
 "Transformer les 98 Instituts français en laboratoires de co-création artistique",
 "Créer un « Erasmus mondial de la culture » de 10 000 mobilités par an d'ici 2030",
 "Faire de la francophonie le premier espace de coopération, avec une alliance francophone de l'IA",
])
vl(12, "Pouvoir d'achat", [
 "Étendre la participation aux entreprises de plus de 50 salariés : un euro de participation pour deux euros de dividendes",
 "!Basculer plus de 200 milliards d'euros de cotisations vers la CSG en dix ans, pour environ +200 € de salaire net par mois en moyenne",
 "!Vendre l'électricité aux ménages proche de son coût de production, via des contrats couvrant 95 % de la facture, et supprimer certaines taxes",
])
vl(12, "Logement", [
 "!Produire 500 000 logements par an, dont 100 000 logements sociaux",
 "Créer un statut de logement social coopératif",
 "Remplacer la taxe foncière par une taxe sur le foncier nu et créer un statut unique du bailleur privé",
 "Créer une banque publique du logement (prêts viagers hypothécaires, prêts sur la nue-propriété)",
 "Créer une garantie locative universelle : les assureurs couvriraient les impayés de loyer",
])
vl(12, "Transports", [
 "Distribuer des cartes-mobilité de 100 € dans les communes de moins de 3 500 habitants, sous conditions de ressources",
 "Instaurer un prix unique au kilomètre pour les liaisons entre préfectures, sous-préfectures et métropoles",
 "Proposer un million de voitures électriques compactes en leasing social sur le quinquennat",
 "Aider les communes rurales à acquérir des « voitures communales » électriques",
])
vl(12, "Énergie", [
 "Développer chaque technologie de production électrique selon son coût de long terme, avec des appels d'offres annuels",
])
vl(12, "Agriculture et alimentation", [
 "Imposer un rayon bio et local dans les grandes surfaces",
 "Étendre les contrats écrits EGalim aux céréales, fruits et légumes et renforcer la DGCCRF",
 "Signer des contrats de long terme par filière, avec des prix fondés sur les coûts de production",
 "Moderniser les outils agroalimentaires de proximité pour la sécurité alimentaire en cas de crise",
])
vl(13, "Santé", [
 "Garantir un accès rapide à un professionnel de santé (téléconsultation, IA, tri aux urgences)",
 "Créer des parcours coordonnés pour les maladies chroniques, avec un référent social",
 "!Augmenter de 50 % les dépenses de prévention sur le quinquennat",
 "Enseigner la prévention des risques physiques et psychiques à l'école",
 "!Plafonner le reste à charge annuel des patients selon leur revenu",
 "Lancer une campagne nationale sur la santé des femmes (cœur, ménopause, endométriose)",
 "Rendre pluriannuel l'objectif de dépenses de l'Assurance maladie et régionaliser les financements hospitaliers",
 "Débureaucratiser l'hôpital et permettre aux hôpitaux publics de passer au statut d'ESPIC",
])
vl(14, "Solidarités et handicap", [
 "Désigner un référent personnel permanent pour les personnes âgées, handicapées, malades ou jeunes vulnérables",
 "Reconnaître les 11 millions d'aidants, dont 500 000 jeunes aidants, avec un statut de travailleur aidant",
 "Créer des équipes territoriales contre la pauvreté",
 "Créer 30 000 places d'hébergement (« logement d'abord »)",
 "Voter une loi-cadre contre la pauvreté, en évaluant les politiques sur les 10 % les plus pauvres",
 "Renforcer l'aide sociale à l'enfance, avec formation et certification obligatoires des familles d'accueil",
 "Créer une allocation d'autonomie pour les jeunes de 18 à 25 ans sortis de l'aide sociale à l'enfance",
 "Enquêter sur les dérives de l'adoption internationale",
 "Supprimer la barrière d'âge de 60 ans pour la prestation de compensation du handicap",
 "Rendre accessibles les services publics essentiels d'ici 2029 et tous les bâtiments publics d'ici 2035",
 "Renforcer l'école inclusive avec un enseignant référent et des AESH mieux déployés",
])
vl(15, "Enfance et jeunesse", [
 "Instaurer trois rendez-vous en PMI (grossesse, naissance, 6 mois) pour repérer dépression post-partum et violences",
 "Créer un service public de la petite enfance et revaloriser les assistantes maternelles",
 "Prendre en charge 20 à 33 séances par an de soins du psychotraumatisme pour les enfants victimes de violences",
 "Interdire qu'un adulte soit seul avec un enfant de moins de 12 ans dans le périscolaire",
 "Offrir chaque année un rendez-vous chez un psychologue aux jeunes à des âges clés",
 "Former tous les jeunes aux premiers secours et leur faire découvrir les réserves",
 "!Créer des bourses d'autonomie de 400 € par mois pour les 18-25 ans, remboursables à taux zéro selon les revenus futurs",
 "!Garantir un emploi ou une formation à tous les jeunes de 18 à 25 ans sans activité",
 "Proposer une aide à la parentalité dans chaque Maison du lien",
])
vl(15, "Grand âge", [
 "Créer un parcours de prévention pour vieillir en restant autonome",
 "Construire 100 000 places d'Ehpad et de logements intermédiaires en dix ans",
 "Ouvrir au moins une unité de soins palliatifs et une maison d'accompagnement par département d'ici 2030",
])
vl(16, "Travail et dialogue social", [
 "!Inscrire dans la Constitution une charte des droits sociaux et confier aux partenaires sociaux la revalorisation du Smic",
 "Proposer l'adhésion à un syndicat à chaque embauche, avec un chèque syndical de l'État",
 "!Réserver 30 % des sièges des conseils d'administration aux salariés dans les entreprises de plus de 1 000 salariés",
 "Réunir une conférence sociale sur la qualité de vie au travail",
 "Viser zéro accident du travail mortel en 2032",
 "Créer une sécurité sociale professionnelle : revenu de transition jusqu'à deux ans pour se reconvertir",
 "Soumettre à la CSG les dépenses d'IA des entreprises",
 "Instaurer un dialogue social sur l'IA dans les entreprises de plus de 50 salariés",
])
vl(16, "Retraites", [
 "Préparer la réforme des retraites en un an : experts, conférence sociale, convention citoyenne tirée au sort, débat parlementaire puis référendum",
 "!Créer un système à trois étages : retraite minimum d'État, retraite par points gérée par les partenaires sociaux, capitalisation publique via le Fonds France",
])
vl(17, "Vie associative et sport", [
 "Créer une réserve citoyenne nationale locale et un registre communal des compétences",
 "Créer une Maison du lien dans chaque bassin de vie",
 "Créer une carte du citoyen engagé, avec 10 % d'abattement d'impôt pour les retraités bénévoles",
 "Valider des trimestres de retraite pour le bénévolat associatif",
 "Consacrer 2,5 % du budget de l'État aux associations d'ici 2032",
 "Créer un chèque fiscal associatif de 30 € par contribuable",
 "Généraliser le mécénat de compétences",
 "Financer 150 000 emplois associatifs au Smic sur des contrats de trois ans",
 "Financer les réseaux de voisinage d'aide aux personnes vulnérables",
 "Exonérer les successions et donations entre non-parents jusqu'à 100 000 € par personne",
 "Organiser des États généraux du sport dès fin 2027",
 "Garantir un « savoir-bouger » en fin de CM2 et rendre les équipements sportifs accessibles d'ici 2032",
 "Rembourser l'activité physique adaptée prescrite aux malades",
 "Créer des Maisons des sports dans chaque bassin de vie",
 "Consigner une part des revenus des jeunes sportifs jusqu'à leurs 18 ans",
 "Soutenir 10 000 cafés ruraux, dont plus de 1 000 créations en cinq ans",
 "Interdire les enregistrements dissimulés de personnes privées",
])
vl(18, "Égalité femmes-hommes", [
 "Inscrire l'égalité réelle entre femmes et hommes à l'article 1er de la Constitution",
 "Revaloriser les métiers à prédominance féminine (soin, éducation)",
 "Former les soignants au repérage du contrôle coercitif et des violences sexuelles",
 "Renforcer le statut du parent isolé",
 "Viser 50 % de filles dans les nouvelles formations d'ingénieurs et du numérique d'ici 2035",
 "Imposer 40 % de chaque sexe parmi les cadres dirigeants dès 2028, y compris dans les entreprises de 250 salariés",
])
vl(19, "Économie et industrie", [
 "!Créer un « Fonds France » réunissant 1 200 à 1 600 milliards d'euros d'actifs de l'État, dont chaque Français serait actionnaire",
 "Réformer le Plan et transformer le CESE en « Assemblée du futur »",
])
vl(20, "Éducation", [
 "Augmenter de 20 % la dépense par élève en dix ans",
 "!Augmenter d'au moins 10 % la rémunération des enseignants",
 "Mettre deux enseignants par classe et développer la remédiation en petits groupes",
 "Créer des auxiliaires d'enseignement qui suivent un groupe d'élèves",
 "Expérimenter l'élection des chefs d'établissement par le conseil pédagogique",
 "Interdire réellement le téléphone à l'école et graduer l'exposition des enfants à l'IA",
 "!Imposer des objectifs de mixité sociale à l'enseignement privé financé par l'argent public",
 "Répartir les moyens de l'éducation prioritaire selon l'origine sociale des élèves plutôt que par zones",
 "Faire de Parcoursup un outil d'aide aux conseillers d'orientation",
 "Créer des cursus de présélection des futurs enseignants réservés aux boursiers dès le bac",
 "Créer des internats d'excellence des savoir-faire artisanaux et industriels",
 "Instaurer 30 minutes d'activité physique par jour et 100 heures de pratique artistique par an",
 "Viser +20 points aux évaluations PISA en mathématiques et en lecture d'ici la fin du quinquennat",
 "Créer des Maisons des arts, des sciences et du sport partagées par les établissements",
 "Créer des filières d'excellence réservées aux bacheliers professionnels",
 "Créer un parcours d'éducation aux émotions et à la coopération de la crèche à la majorité",
 "Nommer un coordinateur bien-être et protection de l'enfance dans chaque établissement",
 "Stabiliser et former les personnels de l'école inclusive",
])
vl(21, "Recherche et université", [
 "!Porter la recherche à 3 % du PIB, avec 5 milliards d'euros de crédits annuels en plus",
 "Créer des chaires « jeunes professeurs » de trois ans renouvelables",
 "Faire des universités les opérateurs de la formation continue et rendre la VAE gratuite au bout de dix ans",
 "Réduire la précarité dans l'enseignement supérieur avec un statut d'attaché permanent d'enseignement",
 "Créer un Centre national de la recherche appliquée aux côtés du CNRS",
 "Financer jusqu'à 2 500 contrats Cifre de doctorants en entreprise",
 "Assouplir le statut de jeune entreprise innovante",
 "Recentrer le crédit d'impôt recherche sur la deeptech et l'innovation de rupture",
])
vl(22, "Écologie", [
 "Nommer un défenseur des communs (eau, air, sols, mers)",
 "Partager l'eau par des allocations collectives annuelles par point de captage d'ici 2050",
 "Rémunérer les agriculteurs pour les services rendus à l'eau (haies, mares, zones humides)",
 "Créer des espaces publics frais à moins de 20 minutes de chacun pendant les canicules",
 "Créer un Institut de santé environnementale avec données en libre accès",
 "!Réduire de moitié l'usage des pesticides d'ici 2030",
 "Placer 15 % du territoire sous protection forte d'ici la fin de la décennie, contre 5,9 % aujourd'hui",
 "Créer un marché intercommunal des droits à artificialiser les sols",
 "Créer une filière de l'économie circulaire",
 "Financer les acteurs de la transition écologique (démonstration, sensibilisation)",
])
vl(22, "Agriculture et alimentation", [
 "Doter la transformation agricole de 1,5 milliard d'euros de plus par an",
 "!Maintenir 400 000 exploitations familiales, avec un revenu annuel minimum visé pour les agriculteurs",
 "Créer un statut d'exploitation commerciale exportatrice",
 "Atteindre 20 % d'exploitations en bio d'ici la fin du quinquennat",
 "Ouvrir les prêts de consolidation de Bpifrance à toutes les fermes",
 "Protéger les infrastructures agroalimentaires stratégiques contre les cyberattaques",
 "Créer des filières de reconversion vers l'agriculture dans les collèges et lycées",
])
vl(23, "Économie et industrie", [
 "!Reprendre les autoroutes en gestion publique à la fin des concessions (2031-2036)",
 "Créer des foncières publiques régionales de 10 milliards d'euros pour acheter des terrains industriels",
 "Orienter en priorité le Fonds France vers la réindustrialisation",
 "Lancer 100 territoires pilotes de réindustrialisation par les compétences",
 "Exonérer de droits de succession les transmissions anticipées d'entreprises familiales",
 "Donner aux industriels l'électricité au prix de production du parc français pour 95 % de leur facture",
 "!Supprimer les impôts de production en les intégrant à l'impôt sur les sociétés",
 "Faciliter l'accès des PME à la commande publique et à la trésorerie",
 "Créer une direction générale de la protection des entreprises contre l'espionnage",
 "Conditionner les aides aux entreprises de plus de 1 000 salariés à des engagements sociaux et environnementaux",
 "Encourager les entreprises à mission et une comptabilité financière, humaine et écologique",
])
vl(24, "Culture", [
 "Interdire les algorithmes de défilement infini qui captent l'attention, notamment des jeunes",
 "Créer un label pour les œuvres générées par IA et rémunérer les auteurs dont les œuvres entraînent les modèles",
 "Taxer les contenus culturels générés par IA pour financer la création humaine",
 "!Garantir aux artistes un revenu de 1 000 € par mois",
 "Créer une Maison des arts dans chaque bassin de vie",
 "Taxer les billets des grandes salles et festivals pour financer les petites salles",
])
vl(25, "Territoires", [
 "Créer des DATAR régionales et des DDE départementales pour des projets de territoire à 2040",
 "Moderniser les grands réseaux (électricité, eau, recharge, télécoms) avec le Fonds France",
 "Signer avec les grandes villes des plans d'adaptation au climat (végétalisation, réseaux de froid)",
 "Rendre obligatoire un volet « mouvement » (marche, vélo, sport libre) dans les documents d'urbanisme",
 "Imposer des lieux communs gratuits dans les opérations de renouvellement urbain",
 "Renforcer les sous-préfectures avec des services pour les élus et les habitants",
 "Rendre les services publics essentiels accessibles en vingt minutes",
 "Compenser les communes qui accueillent de grands équipements (énergie, data centers) par des baisses de facture",
 "Lancer un plan Littoral 2050 sur le recul du trait de côte",
 "Lancer un plan Montagne 2050 avec des préfets de massif",
])

# ======================================================================
JDA = "https://www.journaldelagence.com/1414778-presidentielle-2027-quelles-sont-les-propositions-de-gabriel-attal-pour-le-logement"
add("ATTAL", "Logement", "Créer une banque nationale d'investissement pour le logement, qui financerait jusqu'à 50 % du prix d'achat en échange d'une part du bien", JDA, cle=True)
add("ATTAL", "Logement", "Faciliter l'achat de leur logement par les locataires du parc social", JDA)
add("ATTAL", "Logement", "Aligner la fiscalité des donations des grands-parents aux petits-enfants sur celle des parents aux enfants", JDA)
add("ATTAL", "Logement", "Créer un statut du bailleur privé et étendre la garantie Visale à tous les locataires", JDA)
add("ATTAL", "Logement", "Assouplir le « zéro artificialisation nette » et limiter les recours contre un permis de construire à un seul, jugé en 18 mois maximum", JDA)
add("ATTAL", "Logement", "Reconnaître un droit à la climatisation, notamment en copropriété", JDA)

RUF = "https://www.lagazettefrance.fr/article/presidentielle-ruffin-renonce-le-paysage-se-clarifie-a-gauche"
PR["RUFFIN"]["retrait"] = {"date": "2026-11-21", "texte": "Ne se présente plus : retrait annoncé le 21 novembre 2026, sans soutenir d'autre candidat.", "url": RUF}
PR["TONDELIER"]["note"] = "Candidature maintenue à ce jour. Le 18 novembre 2026, Marine Tondelier s'est dite prête à « travailler à une coalition » autour de Jean-Luc Mélenchon. Les adhérents votent du 10 au 13 décembre : candidature autonome, soutien à Mélenchon ou à Glucksmann. Positions recensées par France-Vote."

json.dump(x, open(F, "w"), ensure_ascii=False, indent=1)
print(len(PR), "candidats ;", len(M), "mesures")
