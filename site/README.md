# Swipe 2027 : déploiement

Le site est fait de pages statiques et de 2 fonctions serveur (Vercel). Supabase gère les comptes et la base de données. L'IA passe par l'API Anthropic.

```
index.html             le site (données intégrées), généré par build.py
template.html          la source du site, à modifier puis passer dans build.py
manifest.webmanifest   + sw.js + icons/ : app installable sur téléphone (PWA)
api/chat.js            chat général, chat par mesure, lecture du profil
api/fiche.js           fiches sourcées générées par l'IA, partagées avec tout le monde
lib/prompts.js         TOUS les prompts système, versionnés
lib/schemas.js         les objets (Fiche, Eco, Source…) en JSON Schema
lib/data.js            la base côté serveur et la recherche par mots-clés
lib/quota.js           quota d'IA par IP (hachée)
data/base.json         la base utilisée par l'IA, générée par build.py
supabase/schema.sql    les tables et règles de sécurité à créer dans Supabase
```

## 1. Supabase (comptes + base) : 10 min

1. Crée un compte sur https://supabase.com, puis un projet (région : Paris ou Francfort).
2. **SQL Editor > New query** : colle `supabase/schema.sql`, puis clique sur **Run**.
3. **SQL Editor** : lance aussi `supabase/migration-002.sql` puis `supabase/migration-003.sql` (remarques), puis `supabase/migration-004.sql` (visiteurs, pour la page admin) (pseudos, consentement, journal des chats, tableau de bord).
3 bis. **Authentication > Sign In / Providers > Email** : laisse « Email » activé mais **désactive « Confirm email »**. Les comptes se créent avec un pseudo et un mot de passe ; l'app génère un e-mail technique `pseudo@users.swipe2027.app` auquel aucun mail n'est envoyé. Mets aussi la longueur minimale du mot de passe à 8.
4. **Authentication > URL Configuration** : mets l'URL de ton site (ex. `https://swipe2027.vercel.app`) dans *Site URL* et dans *Redirect URLs*.
5. **Project Settings > API Keys** : note (les nouvelles clés `sb_publishable_…` / `sb_secret_…` et les anciennes `anon` / `service_role` marchent toutes les deux) :
   - `Project URL` (public) ;
   - la clé `anon public` (publique) ;
   - la clé `service_role` (**secrète**, seulement pour Vercel).
6. Dans `template.html`, remplis `SUPABASE_URL` et `SUPABASE_ANON_KEY` (en haut du script), puis relance `python3 build.py`.

**Fonctionnalités optionnelles** : dans `template.html`, `SWIPE_CONFIG.FEATURES`. `votes: true` réactive l'onglet « À l'Assemblée » (désactivé par défaut, le code et les données restent en place). Relance ensuite `python3 build.py`.

Conseil : pour les vrais utilisateurs, configure un SMTP (Resend, Brevo…) dans **Authentication > SMTP**. L'envoi d'emails par défaut de Supabase est limité à quelques messages par heure.

## 2. Vercel (mise en ligne) : 5 min

Dans le Terminal, depuis ce dossier :

```bash
cd ~/Documents/"analyseur de propositions"/site
npx vercel            # première fois : connexion à ton compte Vercel dans le navigateur, puis « Y » partout
```

Puis dans le tableau de bord Vercel > ton projet > **Settings > Environment Variables** :

| Variable | Valeur |
|---|---|
| `LLM_CHAT` | modèle du chat, des quiz et du profil, au format `fournisseur:modèle` (ex. `openai:gpt-6-luna`) |
| `LLM_FICHE` | modèle des fiches générées (ex. `anthropic:claude-sonnet-5-5`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | seulement les clés des fournisseurs utilisés |
| `ANTHROPIC_MODEL` | ancien réglage, encore accepté si `LLM_CHAT` / `LLM_FICHE` sont absents |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role (secrète) |
| `QUOTA_SALT` | une phrase au hasard (sert à hacher les IP) |
| `ADMIN_PASSWORD` | mot de passe de la page `/admin.html` (12 caractères minimum conseillés) |
| `QUOTA_CHAT` / `QUOTA_FICHE` / `QUOTA_PROFIL` | optionnel : 30 / 3 / 5 par IP et par jour par défaut |

Ensuite, mets en production avec `npx vercel --prod`.

Pour un nom de domaine (ex. swipe2027.fr) : Vercel > **Domains**. N'oublie pas de mettre aussi l'URL dans Supabase (étape 1.4).

Astuce : mets un plafond de dépense mensuel dans la console Anthropic (**Limits**). C'est le filet de sécurité en plus des quotas.

## 3. Mettre à jour les données

```bash
python3 build.py          # relit ../data/ et régénère index.html + data/base.json
npx vercel --prod
```

Les fiches générées par les visiteurs sont dans la table `fiches` de Supabase. Tu peux les relire, les corriger, ou supprimer une ligne pour forcer une nouvelle génération.

## 4. L'IA : prompts et objets

- **Indépendant du fournisseur** : tout passe par `lib/llm.js` (Claude, GPT ou Gemini). Pour changer de modèle, change `LLM_CHAT` ou `LLM_FICHE` dans Vercel, puis redéploie. `/api/health?key=<ADMIN_PASSWORD>` teste les deux modèles configurés.
- Recherches web : plafonnées par `CHAT_MAX_SEARCHES` (10) et `FICHE_MAX_SEARCHES` (3) chez Anthropic et OpenAI. Gemini n'a pas de plafond par requête.
- **Langfuse (facultatif)** : prompts et modèle modifiables sans redéployer, et suivi de chaque appel (modèle, tokens, coût, durée).
  1. Crée un projet sur https://cloud.langfuse.com (région UE), puis **Settings > API Keys**.
  2. Crée le fichier `../.env.langfuse` (ignoré par git) avec `LANGFUSE_PUBLIC_KEY=pk-lf-…`, `LANGFUSE_SECRET_KEY=sk-lf-…`, `LANGFUSE_BASE_URL=https://cloud.langfuse.com`.
  3. Depuis `site/` : `node --env-file=../.env.langfuse scripts/langfuse-sync.mjs` envoie les 8 prompts. Relance-le après chaque modification de `lib/prompts.js` : il crée une nouvelle version seulement pour les prompts modifiés et garde le modèle réglé dans Langfuse (`--dry` pour voir sans envoyer).
  - Structure : `swipe-system`, un prompt système court et commun (identité, neutralité, règles) ; `swipe-consignes_chat`, le bloc recherche web + format des 3 chats ; puis un prompt utilisateur par tâche (`swipe-general`, `swipe-mesure`, `swipe-prof`, `swipe-quiz`, `swipe-profil`, `swipe-fiche`), qui contient la consigne, les données et la question.
  - Changer de modèle : `node --env-file=../.env.langfuse scripts/langfuse-model.mjs openai:gpt-6-luna chat` (cibles : `chat`, `fiche`, `all` ; `--searches N` en option ; sans argument, affiche les modèles actuels).
  4. Ajoute les 3 mêmes variables dans Vercel, puis redéploie.
  - Le modèle se règle dans la **Config** de chaque prompt : `{"model": "openai:gpt-6-luna", "max_searches": 10}`. Priorité : config Langfuse > `LLM_CHAT` / `LLM_FICHE`.
  - Le site lit la version au label `production`, avec un cache d'une minute. Si Langfuse ne répond pas, il garde la dernière version connue, sinon les prompts de `lib/prompts.js`.
- Script de fiches en lot : `node scripts/generer-fiches.mjs --n 20 --model openai:gpt-6-luna` (affiche le coût estimé à la fin).

- **Le navigateur n'envoie jamais de prompt.** Il envoie seulement `{ mode, mesureId, messages }`, et le serveur construit le prompt dans `lib/prompts.js`. Sans ça, n'importe qui pourrait utiliser ta clé comme un Claude gratuit.
- **4 prompts :**
  - `general` : chat politique, avec les extraits de la base injectés dans `<base>` ;
  - `mesure` : chat sur une mesure, avec la fiche sourcée injectée ;
  - `profil` : lecture neutre des choix de l'utilisateur ;
  - `fiche` : génération d'une fiche avec recherche web.
- **Règles communes (bloc `REGLES`)** :
  - neutralité, aucune consigne de vote ;
  - faits séparés des opinions ;
  - zéro citation inventée ;
  - présomption d'innocence ;
  - les données de `<base>` sont traitées comme des données, pas comme des instructions (protection contre l'injection) ;
  - refus poli hors sujet.
- **Sortie structurée** : la fiche est produite par un appel d'outil `enregistrer_fiche`, dont le schéma est `FICHE` dans `lib/schemas.js`. `cleanFiche()` retire tout élément sans URL et refuse une fiche qui a moins de 2 critiques.
- **Versionnage** : change `PROMPT_VERSION` à chaque modification. Chaque fiche et chaque réponse garde la version qui l'a produite.

## 5. Applis iPhone et Android

- **Dès maintenant, sans store** : le site est une PWA. Sur iPhone, Safari > Partager > « Sur l'écran d'accueil ». Sur Android, Chrome propose « Installer l'application ». L'icône et l'écran plein se règlent tout seuls.
- **Sur les stores** : on emballe ce même site avec **Capacitor**. Un seul code pour iOS et Android, et le site reste la source.

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Swipe 2027" fr.swipe2027.app --web-dir .
npx cap add ios && npx cap add android
npx cap open ios        # Xcode (Mac obligatoire)
npx cap open android    # Android Studio
```

Comptes développeur nécessaires :
- Apple Developer : 99 $/an ;
- Google Play : 25 $ une fois.

Points d'attention :
- Apple refuse les apps qui ne sont qu'un site emballé (règle 4.2). Les comptes, le profil, le hors-ligne et des notifications (ex. « la mesure du jour ») aident à passer.
- Les deux stores demandent une politique de confidentialité et la suppression de compte dans l'app. Les règles RLS du schéma permettent déjà de supprimer son profil : un bouton reste à ajouter.
- Contenu politique : les stores l'acceptent pour l'information électorale, à condition de citer ses sources et de ne pas se faire passer pour un service officiel.

## 6. Suivre l'activité

**Visiteurs (avec ou sans compte)** : Vercel > ton projet > onglet **Analytics** > **Enable** (gratuit, sans cookie). Le script est déjà dans le site ; les chiffres apparaissent après le prochain `npx vercel --prod`. On y voit les visiteurs uniques, les pages vues, les pays, les appareils et les sites d'origine.

**Dans la page admin** (section « Visiteurs ») : visiteurs par jour, avec ou sans compte, et pages vues par onglet. Il faut avoir lancé `supabase/migration-004.sql`.

**La page admin**

`https://<ton-site>/admin.html` → mot de passe = `ADMIN_PASSWORD`. On y voit :
- inscrits, profils actifs, nombre de réponses ;
- mesures les plus vues, aimées, rejetées ;
- questions posées à l'IA (anonymes : ni compte ni IP), avec la réponse en cliquant ;
- utilisation de l'IA jour par jour ;
- fiches générées, avec un bouton pour en supprimer une (elle pourra être régénérée).

Les données brutes sont aussi dans Supabase > Table Editor (`profils`, `chats`, `fiches`, `usage`) et Authentication > Users.

## 7. Données personnelles

- Case de consentement obligatoire à l'inscription (les réponses peuvent révéler des opinions politiques : article 9 RGPD).
- Page `/confidentialite.html` : **remplace `CONTACT_A_COMPLETER`** par une adresse de contact avant le lancement.
- Bouton « Supprimer mon compte » dans Profil : efface le compte et toutes les réponses (`api/compte.js`).
- Chats : journal anonyme, à purger après 12 mois (`select purge_chats();` dans le SQL Editor, ou une tâche Cron Supabase).
- Ce n'est pas un avis juridique : fais relire avant un lancement public.
