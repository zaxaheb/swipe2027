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
- **Comparable measures (2):** matched automatically by shared words, with a few visible mistakes.
- **Balance (1):** in a subject, one line per candidate (their best-documented measure), the rest folded.
- **Reporting (6, light version):** one tap (Biased / Incomplete / Error / Source), then an optional sentence and link, sent to the existing `remarque` API.
- **Limits:** the 14 subjects are assigned by keywords and some are wrong (to redo with an AI pass, then review). AI features (chat, on-demand fiches, sending reports) don't work locally.
