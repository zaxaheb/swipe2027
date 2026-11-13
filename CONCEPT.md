# Analyseur de propositions — Présidentielle 2027

Nom de travail, à renommer.

## L'idée
Analyser les programmes **proposition par proposition**, pour les mettre en perspective.
- Pas un comparateur au départ : un **analyseur**, 1 proposition à la fois.
- Pour chaque proposition : les **critiques réelles** des autres partis (et des médias / experts), pas l'avis de l'IA.
- L'IA **collecte et structure** des critiques sourcées. Elle ne donne pas son explication.
- Angle : on part des « vues » de chaque partie, chacune avec ses critiques représentées.

## Fiche proposition (format cible)
- Proposition (texte exact + source : programme, interview, date)
- Candidat / parti
- Ce que ça implique concrètement (coût, mesures, calendrier si annoncés)
- Critiques par camp (citation + source + lien)
- Réponses / contre-arguments du camp qui propose
- Contradictions (avec d'autres propositions du même camp, déclarations passées)
- Revue de presse : comment la proposition est reçue

## Sorties
1. **Compte Insta** : 1 proposition par jour + revue de presse de sa réception, contradictions, explications. Suivre l'actu : les propositions qui font le plus parler.
2. **Site** : centralise toutes les fiches (à maintenir → automatiser au max).
3. **App mobile** : un « Tinder des propositions ». Chaque carte = proposition, les photos = explications / contradictions, un chat pour creuser, swipe gauche/droite → à la fin tu obtiens ton profil.

## Lien avec Politic Review
`~/Documents/politic review` fait déjà la revue de presse par candidat (collect → analyze → aggregate → render carrousels).
On peut réutiliser la collecte presse (config/medias.json) et le rendu carrousels, mais ici le pivot est la **proposition**, pas le candidat.

## Questions ouvertes
- Sources des propositions : programmes officiels, sites de campagne, interviews ?
- Sources des critiques : communiqués des partis, tweets/X, presse, think tanks, fact-checkers ?
- Neutralité : comment garantir un traitement équilibré entre camps ?
- Par quoi on commence : pipeline de fiches, format Insta, ou prototype de l'app ?

## État au 13/11/2026 — v1 de l'app « Swipe 2027 »
App publiée (privée) : https://claude.ai/artifact/KZNDL1G3EbHduTFukXFHSD
- `data/programme/aec_programme_2027.json` : 988 mesures + 81 sous-points (= 1 069), 111 sections, 107 mesures clés, extraites de lavenirencommun.org
- `data/assemblee/` : 9 895 scrutins de la 17e législature (open data AN). `scrutins_17e_cles.json` = 262 votes clés utilisés dans l'app
- `data/condamnations/condamnations.json` : 110 condamnations (51 définitives / 59 non définitives), base Poligraph + arrêt RN du 7/07/2026
- `data/fiches.json` : fiches sourcées niveau 2 (pour l'instant : Smic 1 700 €)
- `app/` : template.html + build.py → swipe2027.html (build.py lit les données depuis le dossier de staging, chemin à adapter)
Niveau 1 (les autres mesures) : analyse générée par Claude à la demande, marquée « à vérifier », mise en cache partagé.
