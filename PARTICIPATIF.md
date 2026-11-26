# Espace participatif : proposition (branche `zak/participatif`)

Maquette cliquable : `site/maquette-participatif.html` (en local, ou sur `/maquette-participatif` dans la preview Vercel de la branche). Les données y sont fictives.

## Ce qu'on construit

1. **Discussion sous chaque carte** : un onglet « Discussion » à côté de Concrètement, Pourquoi et Critiques.
   - Analyses des lecteurs, votes ▲ « utile » / ▼ « pas utile ».
   - Réponses sur un seul niveau.
   - Tri « Les plus utiles » (votes + score IA) ou « Récentes ».
2. **Forum**, un objet à part : des fils reliés, si besoin, à un sujet, à un ou plusieurs candidats et à des mesures.
   - Le même fil apparaît dans le forum, dans l'onglet du sujet, sur la fiche candidat et sous la carte.
   - Tri : Populaires, Récents, Peu de réponses.
3. **Compte obligatoire** pour poster et voter. C'est le compte pseudo + mot de passe qui existe déjà (`api/compte.js`). La lecture reste libre.
4. **Modération en deux temps.**
   - **Filtre IA**, avec une note sur 100 :
     - Sources : 30 points.
     - Profondeur : 30 points.
     - Ton et respect : 20 points.
     - Pertinence : 20 points. C'est une analyse et pas un avis : aucun « votez X ».
   - **Sous le seuil (60 par défaut)** : le message est refusé tout de suite. L'auteur voit la note et des conseils, et son brouillon est gardé.
   - **Au-dessus du seuil** : le message va dans une file de modération humaine, dans `admin.html`.
   - Option : publier directement au-dessus de 85, avec une relecture après coup.
   - Signalements : un message publié est masqué au bout de 3 signalements, en attendant une revue.
   - Règle de neutralité du filtre : la note ne dépend pas de l'opinion. Une analyse sourcée pour une mesure et une analyse sourcée contre doivent avoir la même note. On le vérifiera sur un jeu de tests (paires pour et contre).

## Tables Supabase (migration-006, à écrire)

```
fils         id, auteur, titre, texte, sources jsonb, statut, score_ia, eval_ia jsonb, votes int, nb_messages int, cree_le
fil_liens    fil_id, type ('sujet'|'candidat'|'mesure'), cle            -- un fil ↔ plusieurs objets
messages     id, auteur, cible_type ('mesure'|'fil'), cible_id, parent_id null, texte, sources jsonb,
             statut ('refuse'|'attente'|'publie'|'masque'|'supprime'), score_ia, eval_ia jsonb, votes int, cree_le
votes        user_id, objet_type ('message'|'fil'), objet_id, valeur (-1|1)   -- clé primaire : user_id + objet_type + objet_id
signalements user_id, objet_type, objet_id, motif, cree_le
moderation   id, objet_type, objet_id, moderateur, decision, motif, cree_le   -- historique des décisions
pseudos      user_id, pseudo, charte_acceptee_le, bloque bool, nb_messages_jour
```

- RLS : lecture publique des lignes au statut `publie`. Toute écriture passe par l'API côté serveur, avec la clé service, comme aujourd'hui.
- Un trigger tient à jour `votes` et `nb_messages`.

## API (Vercel)

- `POST /api/participer` : publie un message, une réponse ou un fil. Les étapes :
  1. Vérifie le jeton.
  2. Applique un quota par jour : 3 messages pour un compte de moins de 7 jours.
  3. Fait noter le texte par l'IA avec la grille (`lib/prompts.js`, nouveau prompt `swipe-moderation` dans Langfuse).
  4. Enregistre le message, au statut `refuse` ou `attente`.
- `GET /api/participer?cible=mesure:<id>` et `?forum&sujet=…&candidat=…&mesure=…&tri=…` : lecture.
- `POST /api/vote` et `POST /api/signaler`.
- `api/admin.js` : liste de la file, décisions (publier, refuser, demander une source, bloquer) et réglages (seuil, publication directe).

## Questions ouvertes

- Le score IA reste-t-il visible publiquement, ou seulement pour l'auteur et les modérateurs ?
- Le vote ▼ « pas utile » est-il visible, ou sert-il seulement au tri ?
- Qui modère au lancement : toi seul, ou aussi Max et Marion avec un rôle « modérateur » ?
- Faut-il une notification quand un message est publié ou qu'on répond à l'utilisateur ? Elle serait dans l'app, il n'y a pas d'e-mail.
