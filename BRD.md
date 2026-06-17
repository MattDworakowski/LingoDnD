# LingoDnD — Business Requirements Document (v0.1, draft)

> **Status:** Working draft for review. Sections tagged **[PROPOSAL]** are my
> recommendations on points that were still open in discussion — react to those
> first. Sections tagged **[OPEN]** are unresolved questions parked for later.
> _Last updated: 2026-06-17._

---

## 1. Summary

**LingoDnD** is a mobile German-language-learning game for early primary-school
children, built around a continuous, episodic Dungeons-&-Dragons-style fantasy
campaign. The child listens to a narrated quest in slow, simple Hochdeutsch,
makes choices, rolls a d20 at pivotal moments, fights or talks their way through
encounters, and answers short comprehension/memory mini-games. Correct answers
earn XP that levels up a character the child builds and equips over time.

The core bet: **pure language apps and pure games both struggle to keep kids
coming back; a campaign with a character you grow and a story that continues does
not.** Language practice (listening comprehension) is the substance; the RPG
campaign is the retention engine.

**One-line positioning:** _an interactive Toniebox for German_ — the bedtime-
story audio kids already use to practice German, but interactive and campaign-
driven, which is where engagement actually comes from.

---

## 2. Goals & non-goals

### Goals
1. Ship a polished, complete app to **both the Apple App Store and Google Play**.
2. Validate the core hypothesis: **will children keep coming back for the next
   episode?** (Measured via the episode-download funnel — see §5, §13.)
3. Deliver genuine **German listening-comprehension practice** for early primary
   schoolers, working for both early learners (e.g. English-first kids in
   Switzerland learning Hochdeutsch) and native German speakers.
4. Serve as a hands-on **learning project for end-to-end mobile deployment**
   (build, store submission, content delivery, compliance).

### Non-goals (v1)
- No monetization yet — **but the architecture must not foreclose it later.**
- No multiplayer.
- No languages other than German.
- No user accounts / login / cloud sync (on-device only).
- No free-text character naming (two fixed pre-built avatars instead).

---

## 3. Target audience

- **Primary user:** children in **early primary school** (~ages 6–9).
- **Language profile:** works for two overlapping groups —
  - **Early learners** acquiring Hochdeutsch (e.g. English-first children in
    Switzerland, where Hochdeutsch is introduced at primary school);
  - **Native German speakers**, for whom it still plays as a fun fantasy game.
- **Secondary user:** the **parent**, who installs the app, controls purchases /
  external links (via the required parental gate), and may listen along.
- **Reading ability:** not assumed. The UI is **audio- and icon-driven**, with
  minimal on-screen German text. (A parent-facing narration-text view may exist,
  as in the predecessor app.)

---

## 4. Tone & content guardrails

Tone is a **first-class requirement**, not a detail — playtesting the predecessor
app surfaced two distinct failure modes:
- **Too cute / "too baby"** — disengaging for this age.
- **Too spooky / dark** — swings too far the other way.

**The target is the "Goldilocks" middle: a classic high-fantasy D&D world.**

- **Lore frame:** elves, dwarves, and other fantasy races; some good-natured
  friction between races; a central **quest for a powerful item that must not
  fall into the wrong hands or the world is in trouble.**
- **Conflict:** real stakes and occasional combat, or charming/talking your way
  past it — but **no gore, no blood, no genuinely frightening horror.** Peril is
  adventurous, not traumatic.
- **Register:** slow, clear, simple Hochdeutsch suitable for a 6–9-year-old
  learner; second-person narration (see §8.4).

---

## 5. Success metrics

Because the app is **on-device with no personal accounts**, success is measured
primarily through the **content backend's anonymous, aggregate download funnel**
plus hands-on playtesting.

| Metric | How measured | Target (v1) |
|---|---|---|
| **Episode-download retention** | Aggregate count of devices fetching ep. 2, ep. 3, … from the content backend (no PII) | A meaningful share of ep.-1 players fetch ep. 2, and a curve that doesn't collapse by ep. 3 |
| **Qualitative engagement** | Direct playtesting with a handful of children | Kids finish ep. 1 and ask for the next one |
| **Comprehension** | In-app mini-game accuracy (stored on-device; optionally reported in anonymous aggregate) | Accuracy is non-trivial and trends up across an episode |
| **Ship** | App live on both stores | Approved in the Kids Category / Families program |

> **[OPEN]** True per-device cohort retention would need an anonymous random
> install ID (permissible if first-party / non-PII / disclosed). Decide later
> whether the download funnel alone is enough for v1.

---

## 6. Core gameplay loop

1. **Listen** to a narrated scene in German (with an "anchor" image revealed as a
   visual clue — see §8.5).
2. **Mini-game** — a short comprehension/memory check. Correct → **XP**.
3. **Decide / roll** at a pivot — choose an action and/or roll a **d20** (physical
   die tapped in, or digital shake-to-roll). The roll branches the story.
4. **Encounter** (some scenes) — **combat** (dice + stat bonus + HP) or a
   **charisma talk-out**, resolved with the same dice mechanic.
5. **Progress** — branches **merge back** to the campaign spine; character state
   (level, stats, items, story flags) **persists** across scenes and episodes.
6. **Level up** — accumulated XP raises the character; the child picks a perk.
7. **Episode ends on a hook** → prompt to get the next episode (retention).

---

## 7. Story & episode system

### 7.1 Structure
- The campaign is **one continuous story chopped into episodes**; continuity is
  the primary stickiness lever ("what happens next?").
- **Each episode ≈ 10–15 minutes** of playtime.
- Each episode **ends on a cliffhanger / hook** that motivates fetching the next.
- **Launch with 3 episodes**, then release roughly **one per week** (cadence is a
  business lever, not a technical constraint — see §11).
- **[PROPOSAL]** Ship an **Episode 0 / tutorial** that teaches dice rolling,
  mini-games, and combat in a low-stakes way before the campaign proper.

### 7.2 Branching model (decided)
- **Branch-and-merge.** Choices and rolls fork the story for a scene or two, then
  **re-converge** to a shared beat — "you reach the magic door different ways,
  but you always reach the magic door." This keeps the authored tree bounded
  (no exponential blow-up) while still feeling reactive.
- **Continuity lives in character state, not the tree.** Level, stats, items, HP,
  and a **small set of persistent flags** ("you spared the kobold," "you have the
  silver key") carry across episodes and can be referenced in later narration
  **without forking the whole campaign.**
- A **linear campaign spine** guarantees every child hits the same major beats in
  the same order; branching is local color + which approach the child's **class**
  unlocks.

> **[OPEN]** Exact branch depth/width per pivot, and how many cross-episode flags
> we maintain. Start minimal; expand only if playtests want it.

---

## 8. Character system

### 8.1 Creation
- Child picks a **gender avatar** (one of two fixed, pre-built characters) and a
  **class** (§8.2). No free-text naming.

### 8.2 Classes & stats — **[PROPOSAL]**
Three symmetric classes; the chosen class sets the primary stat and the child's
"flavor" of solving problems:

| Class | Primary stat | In combat | In the story |
|---|---|---|---|
| **Krieger** (Fighter) | **Strength** | Hardest-hitting attacks; bonus damage | Unlocks **force** branches (break the door, lift the rock) |
| **Magier** (Magician) | **Magic** | Spell attacks + one **special per fight**: _Feuerball_ (big damage) or _Heilen_ (restore HP) | Unlocks **magic** branches (light a dark cave, dispel a ward, speak to an animal) |
| **Barde** (Diplomat) | **Charisma** | Roll Charisma to **end a fight by talking** → skip the fight, **still earn the XP** | Unlocks **persuade** branches (calm the guard, strike a deal) |

Choosing a class **eliminates the "what if stats are split evenly?" problem** —
every character is always a clear, working build.

### 8.3 Leveling — **[PROPOSAL]**
- **XP comes from correct mini-game answers** (and possibly encounter wins).
- Each level **auto-increases the primary stat** (progression is always felt and
  never "wasted") **and** lets the child **pick one new perk** from a short,
  class-specific list. No raw point-pooling.

### 8.4 Narration & gender (decided)
- Narration is **second-person ("du")**. German predicative adjectives and
  perfect-tense participles **don't inflect for gender** (_"Du bist mutig," "Du
  hast den Drachen besiegt"_), so **audio is rendered once**, not per gender —
  this removes the dual-audio duplication concern entirely. The avatar stays
  gendered (art only); the name appears on the character screen, not in audio.

### 8.5 Items & equipment
- **Equipment slots** (MMORPG / Heroes-of-Might-and-Magic-III style). Items are
  found through the story, equipped into slots, and grant **stat bonuses**.
- **[OPEN] Visual paper-doll:** optionally update the avatar art based on equipped
  items. Promising but unproven with AI-generated art (under testing). **v1
  baseline: stat bonuses + an inventory/slot view with item icons; layered
  paper-doll visuals are a stretch goal**, pending art tests.

---

## 9. Combat (Option A — "HP duel", decided)

- The enemy has HP; the player has HP. **Player HP resets after each encounter.**
- **Each round:** player taps Attack → rolls **d20 + primary-stat bonus**
  (Strength for melee, Magic for spell) vs. the enemy's "armor number."
  - **Hit** → deal damage to the enemy.
  - **Miss** → the enemy deals damage to the player.
- **Class expression:** Magician gets one **special per fight** (big hit or heal);
  **Barde** gets a **pre-combat Charisma roll to skip the fight** (still earns XP).
- **No hard "Game Over."** At 0 HP the child is rescued / retreats with a **story
  consequence**, never a dead-end fail screen. (Failure always still progresses —
  a core kid-friendly principle inherited from the predecessor app.)

> **[OPEN]** Exact numbers (enemy HP, armor targets, damage values, player HP) —
> a balancing exercise, not a requirement. Tune in playtesting.

---

## 10. Mini-games (language layer)

- **Start simple:** short **comprehension + memory** checks tied to the scene just
  heard — e.g. _"What colour was the gem the elf wore?"_, _"Which way did the
  dwarf go — left or right?"_ Typically **multiple-choice**, audio/icon-driven.
- Tests **both understanding and recall**; recall also feeds story decisions
  (remembering details to choose well), reinforcing the game/learning link.
- **Cadence:** ~one check per scene (tunable).
- **Never block progress.** Correct → XP. Wrong → no XP (optional hint/retry); the
  story continues regardless.

> **[OPEN]** Expand the mini-game catalogue (matching, ordering, fill-the-gap)
> after the simple comprehension/memory type is validated.

---

## 11. Content production & delivery

### 11.1 Authoring pipeline
- **Stories and audio are pre-generated** (not generated live on-device).
- **Claude authors each episode** as structured story data (the predecessor's
  `story.json` schema, extended for classes, combat, items, and mini-games).
- A **render step generates media** idempotently: **ElevenLabs** German TTS for
  narration (single "du" render) and **AI-generated images** for cover + story
  anchors. (Builds directly on the predecessor's `render.js` approach.)

### 11.2 Delivery & cadence
- **Episodes are content downloaded from a backend/CDN at runtime**, **separate
  from the app binary** — so a new weekly episode does **not** require an App
  Store / Play review each time.
- The app **ships with episodes 1–3 bundled** for a great first-run, and **fetches
  later episodes** on demand.
- **Downloaded episodes play offline** (audio + images cached on-device).

---

## 12. Platform & technical requirements

- **Cross-platform: iOS (App Store) and Android (Google Play)** from v1.
- **On-device persistence** of character, progress, items, story flags, and
  mini-game stats. No accounts, no cloud sync.
- **Remote content fetch** with on-device caching for offline play (§11.2).
- **Lightweight content backend / CDN** for episode files + the anonymous,
  aggregate download counters that power the retention metric.
- **Architected so monetization could be added later** (e.g. episode packs /
  subscription) without a rewrite — even though v1 is free.

> **[DECIDED]** Tech stack: **React Native + Expo** — one codebase shipping to
> both stores, reusing the JS foundation from the predecessor web app. The user
> has built with Expo before with good results. (Predecessor is web HTML/JS, so
> some logic/asset conventions port over.)

---

## 13. Distribution, privacy & compliance

- **Apple Kids Category** and **Google Play Families** program — **mandatory**,
  with all that entails:
  - **No third-party advertising**, **no third-party analytics**, **no behavioral
    tracking**, **no collection of PII** from children.
  - **Parental gate** required before any external links or purchases.
- **Analytics** are limited to **first-party, anonymous, aggregate** signals
  (notably the episode-download funnel). No per-child identification in v1.
- **Privacy posture:** all gameplay state stays **on-device**; the backend sees
  only anonymous content requests.

---

## 14. Dice mechanic (decided)

- **Physical d20 preferred** — the child rolls a real die and **taps the number**
  they rolled (trust-based, as in the predecessor; cheating only hurts the child's
  own progress, so it's acceptable).
- **Digital fallback** for kids without a die: **shake the phone to roll**, with a
  simple dice-roll animation revealing the result.
- **Two roll types** — **story skill checks** (perception, courage, agility) are
  **pure d20** (luck; any build can attempt, so the dice fun is universal), while
  **combat and class-gated actions** add the relevant **stat bonus** (where the
  build matters). Some class-flavored obstacles are auto-narrated to fit the
  child's class with no roll, as a "your build shines" moment.

---

## 15. Release plan (high level)

1. **MVP build:** character creation (avatar + class), one playable campaign
   episode + tutorial, combat (Option A), comprehension/memory mini-games, dice
   (physical + shake), on-device save, anchor images, "du" narration.
2. **Content:** 3 launch episodes (+ tutorial), authored by Claude and rendered.
3. **Backend:** content CDN + anonymous download counters.
4. **Store submission:** iOS Kids Category + Google Play Families.
5. **Post-launch:** ~weekly episode releases; watch the download funnel; iterate
   tone, difficulty, and mini-game variety from playtests.

---

## 16. Risks & open questions (consolidated)

| # | Item | Notes |
|---|---|---|
| R1 | **Tone calibration** | The "not too cute / not too dark" target is narrow and was the #1 issue in predecessor playtests. Needs tight authoring guidelines + early kid testing. |
| R2 | **Paper-doll avatar art** | Equip-driven visual changes may not hold up with AI art. v1 falls back to stat-only items. (§8.5) |
| R3 | **Branch/flag budget** | How much branching and cross-episode memory before authoring cost balloons. Start minimal. (§7.2) |
| R4 | **Combat balancing** | Numbers TBD via playtest. (§9) |
| R5 | **Retention measurability** | Download funnel vs. anonymous install-ID cohorts. (§5) |
| R6 | **Tech stack** | **Decided: React Native + Expo** (§12). |
| R7 | **Kids-Category constraints** | Hard limits on analytics/monetization; design within them from day one. (§13) |

---

## 17. Out of scope / future

- Monetization (episode packs / subscription) — **deliberately left possible.**
- Multiplayer (e.g. sibling co-op, parent-as-DM).
- Additional languages / difficulty levels.
- Richer mini-game types and deeper, longer-range branching.
- Visual paper-doll equipment.
