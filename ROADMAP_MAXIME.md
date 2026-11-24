# Roadmap: Swipe 2027 (Maxime's notes)

*Written by Maxime: my view of what to work on next, to discuss with Zak. Not a shared decision yet.*

What I want us to work on, so we don't lose track. Last update: 22/11/2026. First round of the election: April 2027.

**Goal (reminder):** anyone, even people who don't follow politics, can understand in a few seconds what a candidate proposes, why it is defended and why it is criticised, without spin. Phase 1: sourced cards. Phase 2: a community of analysts from every side keeps the cards honest.

Shared with Zak now: **1** and **4** (they go together: how the deck is built and how people move through it).

---

## 1. Balance between candidates · *with Zak*
The **data** is very uneven: Mélenchon has 988 of the 1,313 measures (75%), Le Pen 109, every other candidate 2 to 19. Partly a reflection of reality: LFI published a full programme (L'Avenir en commun), most others have not yet.

What users see **today** is better than the raw numbers: the default "Tous les candidats, en alterné" deck takes one card per candidate in turn (sourced fiches first, then key measures). Measured on 22/11/2026: LFI is ~5–11% of the first 200 cards, then 36% at 300 and 38% at 500, and ~76% of the full deck of 1,305, once the small candidates run out.

Where the imbalance will really show is in the new navigation (4):
- **By theme / search:** on most subjects LFI will have several measures and many candidates none. Needs a rule (e.g. one card per candidate per subject, LFI's others folded under "more from this candidate").
- **By candidate:** 988 cards vs 2. Fine as long as we show it as "programme published / not yet published" rather than as a ranking.
- The "number of measures per candidate" bar chart in the info tab shows the gap as-is: rethink it.
- Fiche coverage is uneven too (Zemmour 2 fiches for 19 measures, Attal 4/16, Becht 2/8): fill the gaps on the main candidates first.
- Keep adding other candidates' measures as programmes come out.

## 2. Comparable measures from other parties
On a card, show what the other candidates propose on the same subject, next to the criticism of this measure. "LFI wants the Smic at €1,700: here is what RN, Philippe, Glucksmann… propose on the minimum wage."
- Needs a shared list of subjects/themes across all programmes (the same one serves navigation by theme in 4).
- When a candidate says nothing on the subject, show it ("no proposal found"). That is information too.

## 3. Card UX: quick to read, then go deeper · phone first
Today the text is too big, hard to read, spacing is poorly used: the card is not readable at a glance.
- First view: what is proposed, in one line, plus the essentials (cost, who is for, who is against) readable in ~5 seconds.
- Each part (why it is defended, criticism, cost, comparable measures, sources) opens on demand.
- Iterate on the phone first.

## 4. Navigation without swiping · *with Zak*
People will look for a measure they heard about. They are not trying to work out who to vote for. We test a version without random swiping, with ways in by:
- **news:** recent press articles that mention a measure, and the measures they mention;
- **candidate;**
- **theme** (same list as 2);
- **search** by the words people actually use ("retraite à 60 ans", "Smic à 1 700"), not the programme's wording.
- The news entry point needs a press feed matched to measures. The press collection in `~/Documents/politic review` can be reused.

## 5. Learn from Elyze (2022)
Elyze, a "Tinder of the presidential election" app, was accused of bias and had personal-data problems at launch. Gather what actually happened and the lessons, before deciding.
- Probably a reason on its own to drop swiping (see 4).
- To check: how the cards were written, what was criticised, what the CNIL said, how the team responded.

## 6. UX of the community analysis (Phase 2)
The hardest part on a phone. To design:
- **Taking part:** make it easy to give an analysis rather than a comment. A one-tap gesture to say "this card is biased / incomplete / wrong", then an optional short argument plus a source.
- **Moderation and acceptance:** who decides what is "analysis" and what is "opinion"? Idea: like Community Notes (X), a contribution is shown only when people who usually disagree both find it useful (open-source algorithm).
- **What the reader sees:** the analyses on a card, readable quickly, kept separate from our content.
- **The loop:** an accepted analysis improves the card, and the correction is visible.
- **Getting started:** first invite 10 to 20 analysts from across the spectrum (X, Reddit, blogs), with credit and a link back to their work, before opening to everyone. A lighter version that fits the timeline: link existing analyses on each card. The "Remarque" feature (`api/remarque.js`) is already a starting point.

## 7. Swipe comes back as a guided path, not the main mode
For people who don't know where to start. Search, subjects and candidates stay the main navigation; the swipe becomes one way in among others ("Je ne sais pas par où commencer → Parcours découverte").
- **An ordered path, not random cards:** a coherent sequence of subjects (e.g. pouvoir d'achat → retraites → impôts → santé → école → sécurité → immigration → écologie → Europe → institutions), each broken into precise points ("Âge de départ", "Smic", "Quotas"…). One step = one point.
- **Swipe compares positions on the same point:** within a step, each card is one candidate's position on that point, swiped one after another (like stories). Moving forward goes to the next point. So swiping shows the range of positions ("from 60 to 65 years"), instead of judging isolated measures.
- **Card = the quick read:** the point, the candidate's position in one line, "why defended" and "why criticised" in one line each. Tap to open the full measure page; come back to the path where you left it.
- **No like/dislike by default:** the swipe means "next", not "I agree". This avoids the Elyze trap (biased questions, a profile that reveals political opinions, sensitive data under GDPR art. 9). If we keep a "this convinces me" signal, it stays on the phone and is optional.
- **Option: blind mode.** Show positions without the candidate's name, reveal on demand. The current app already has it ("Mode à l'aveugle"); it reduces partisan reflexes.
- **Balance built in:** every step shows every candidate who has a position, in a fixed neutral order (or shuffled per user), plus "no proposal found" for the others.
- **Short paths too:** one path per subject ("Retraites in 3 minutes"), a progress bar, and the path resumes where you stopped.
- **Depends on:** the subject → point classification, since a step is a point (done 23/11/2026).
- **Status (23/11/2026): prototype in v2** (`#/parcours`). Discovery path = for each subject, the question with the most candidates (12 questions today: Smic, âge de départ, impôt sur la fortune…), plus one path per subject from the subject page. Each question: intro, one card per candidate (order shuffled once per path), then a recap of all positions. Tap right / swipe left = next, tap left = back. "Masquer les noms" hides the candidate and also blanks their name and party inside the text; names come back in the recap. Resumes where you stopped (stored only on the phone).
- **Open questions:** the order of subjects (neutral, or by what people care about most in polls?); length of the full path; all candidates or the main ones only; what the end screen shows if there's no profile.

## 8. Measure which flows work · *needed before choosing between flows*
We need to see where people go to know which navigation works best (search, subjects, candidates, guided path, swipe…).
- **What to measure:** the entry point (home, search, subject, candidate, path, a shared link); the screen-to-screen transitions (e.g. search → measure → other candidate); for the path, start, each step reached, finish, and where people quit; which sections of a measure page get opened; searches that return nothing.
- **How, without tracking people:** only aggregated daily counters, like the existing visit counter (`api/visite.js`, no cookie, daily hashed fingerprint). Transitions are counted as "from screen type → to screen type" (e.g. `chercher → mesure`: 412 today), never as one person's history. Search words are kept only when they return nothing, to fix the search.
- **What we get:** a flow diagram per day/week (Sankey), path completion rate and drop-off step, top sections opened. Enough to compare flows, and A/B versions later.
- **Status:** the v2 prototype records these counters in the page and sends them to a new `api/flux` endpoint (`supabase/migration-005.sql`). Not deployed: needs the migration on Supabase and a view in `admin.html`.

---

## Also to keep in mind
- **Published method:** a short public page saying how measures are chosen, where criticism comes from, how cards are checked, plus a log of corrections. That is what makes "we are balanced" believable.
- **Check the AI-written cards:** most fiches are generated by AI (labelled "à vérifier"). Hand-check the most-discussed measures of each main candidate before any public launch. One viral mistake costs more than ten missing cards.
- **Personal data:** political opinions are sensitive data (GDPR art. 9). Without swiping there is less of it, but chats, remarks and accounts can still reveal opinions: explicit consent, minimum retention. Never publish aggregates like "our users prefer X" (could be seen as an unofficial poll).
- **Candidate list changes:** withdrawals are already happening (Cazeneuve), and the official list only exists after the sponsorship deadline in March 2027. Plan to add and remove candidates easily.
- **Learn from what people search:** log searches (anonymously) to see which measures people actually look for. That should decide which cards get checked first.
- **Licences:** the convictions data (Casier Politique) is CC BY-NC-SA, non-commercial only. Remove or renegotiate it if the app ever has ads or a paid offer.

---

## v2 exploration (22/11/2026) · local branch `maxime/ux-exploration`
A first version without swiping, next to the current app: `site/v2.html` (`/v2` once deployed), built by `python3 build.py` from `site/template_v2.html` and `site/build_v2.py`. The current app (`index.html`) is unchanged.
- **Navigation (4):** home with search, subjects, candidates (alphabetical) and "most debated" (one measure per candidate). No "in the news" entry yet: it needs a press feed matched to measures.
- **Measure page (3):** the essentials on one screen (summary, why defended, why criticised, cost, other candidates), then details in sections you open.
- **Comparable measures (2):** measures on the same precise point first (e.g. "Âge de départ": 14 candidates), then measures matched by shared words, labelled as automatic.
- **Balance (1):** a subject page is split into precise points; each point previews the 3 most different positions (e.g. 62 / 60 / 65 years), then "see all candidates" in alphabetical order. Points with a single candidate are folded at the bottom.
- **Reporting (6, light version):** one tap (Biased / Incomplete / Error / Source), then an optional sentence and link, sent to the existing `remarque` API.
- **Subjects and points (23/11/2026):** 15 subjects and 116 points in `data/sujets_taxonomie.json`; every measure classified in `data/sujets.json` ([subject, point, confidence], one line per measure, easy to fix by hand). Done by AI; all 325 non-LFI measures reviewed by hand (8 fixes), LFI checked by sample. 104 measures are marked confidence 1 (to review). New measures without a classification fall back to keywords.
- **Feedback round 1 (24/11/2026):** renamed Swipe 2027; home = search, "Au hasard" + "Parcours découverte" shortcuts, subjects as colored tiles, main candidates strip, "Récemment dans la presse" (from the dates of articles cited in fiches, one per candidate; a real news feed comes later); floating pill bottom bar with Chat instead of Search (search stays on the home screen); candidates page = main candidates as cards, others below. **To validate:** the "main candidates" list (`PRINCIPAUX` in `site/build_v2.py`); the official list only exists after sponsorships (March 2027).
- **Limits:** AI features (chat, on-demand fiches, sending reports) don't work locally. Classifier suggestions not yet applied: points for water, social and solidarity economy, francophonie, terrorism/intelligence, family taxation.
