# LingoDnD — Backlog

Playtest feedback and ideas, prioritized. Tags: **size** (S/M/L) · **priority**
(now/next/later). See [BRD.md](../BRD.md), [tone guide](tone-and-style-guide.md),
[episode schema](episode-schema.md).

---

## B1 — Visual cues vanish too quickly  ·  S · ✅ DONE  ·  *bug/regression*
**Observed:** the owl, goblin, and key appear only briefly and disappear as soon as
you tap "Weiter".
**Want:** an anchor image should **stay on screen until a new one replaces it**
(this is how the predecessor app behaved — image persists, only swaps when the next
scene reveals a new one).
**Approach:** in `PlayScreen`, hold a `currentImage` in state that updates *only*
when a scene introduces a new `anchor`; don't clear it when navigating into
anchor-less scenes. Keep the "reveal after audio" timing for new anchors. Small,
self-contained fix.
**Re: other items:** independent of **B4** (art *style*, not behaviour — the fix
survives a re-skin). Only **B3** (overworld map → encounters as modals) would change
the presentation model and supersede this; B3 is large/later, so B1 is still worth
doing now for the near-term playtests.

---

## B2 — Combat is too fast and not satisfying  ·  M · ✅ DONE  ·  *feature*
**Observed:** one or two taps and the fight is over — no sense of a battle.
**Want:** each round should feel like a dice ritual, like the mini-games:
1. **Roll the d20** (same dice UI — tap your real die, or digital roll).
2. **Show the maths**: e.g. `🎲 14 + 2 (Stärke) = 16 ≥ 9 → Treffer!`
3. **Animate the enemy HP** dropping (`−3`).
4. On a miss, **show the monster hitting back** and your HP dropping.
5. Repeat until the monster is defeated (still **no Game Over** — rescue at 0 HP).
**Approach:** replace the instant "Angriff" with a per-round roll + an animated
resolution beat (tween HP bars, show the calculation, short pause). Re-tune numbers
(more enemy HP / a few more rounds) so a fight lasts ~3–4 rounds and *feels* like one.
Bonus: turns combat into extra dice-ritual practice. Magier Feuerball / Barde Reden
fold in as alternative round actions.

---

## B3 — Board-game overworld map (Heroes of Might & Magic III style)  ·  L · 🔄 P1+P2 done  ·  *big idea*
**Status:** P1 (map + camera + node walk + scene tray) and P2 (zoom, path art,
transitions) are built — see [b3-map-player-plan.md](b3-map-player-plan.md).
(Fog-of-war was tried and removed — the board reads fine without it.)
Pending: the bespoke Ep-1 map render (blocked on OpenAI billing) + re-tuning node
coords to it; P3 = the zoomed-out campaign grid (all episodes as regions).
**Idea:** instead of the story playing over a near-empty screen, show a **2D
overworld board** with the hero's position; as you travel the hero token **moves and
uncovers new areas** (fog-of-war) deeper into the world. Encounters, items, and
mini-games surface as **modal pop-ups** over the map.
**Notes / approach:**
- Per-episode **map illustration** with named **nodes**; each scene maps to a node;
  the hero token walks node→node along the authored spine; fog reveals what's ahead.
- The episode schema would gain a **map position per scene**; the render pipeline
  would generate the map art.
- Substantial: structure + content + art. Phase it; pairs naturally with B4.
**Open questions:** hand-authored map per episode vs generated; how branch-and-merge
paths render on a board; how much of the map to reveal per scene.
**Proposed approach (how) — DECIDED direction:** a single persistent **campaign
world map** (realm of Aldoria), richly detailed (user refs — denser/bigger than a
simple trail); **each episode concentrates on a region** of it. The **camera pans
(and zooms) across** the world as the story progresses. The map shows only the
**spine nodes** — branches, dice, and combat resolve *inside* a scene **modal**, so
the hero always walks the spine (kills the branch-layout problem). Nodes are placed
on whatever fitting landmarks the generated map provides (bridge / campfire / tower).
Tech in RN: one large AI chibi world map + an overlay (node markers at authored
normalized coords, hero token animating node→node, auto-pan/zoom camera) + the
current scene/action UI moved into a **modal**. Build as a **new MapPlayScreen** so
the working linear player stays as a fallback. **Constraint:** gpt-image-1 ~1536px
max → pans fine but not infinitely zoomable; upscale / tile / commission later for a
huge crisp world. Phasing — P1: map + camera pan + node movement + scene modals;
P2: zoom, fog/reveal, path art, transitions; P3: full multi-region campaign world.

---

## B4 — Art-direction overhaul: polished game art  ·  L · 🔄 in progress  ·  *direction*
**DECISION (from `art-explore/` comparison): Chibi** — polished chibi 2D game style
(Fantasy Heroes-like), via **route (b)** (re-style our AI pipeline; the AI chibi look
was strong/cohesive). `render.js` STYLE constants updated; assets re-rendered in chibi.
Paper-doll equippable gear (route (a) asset pack) remains a future option for §8.5.
**Want:** characters, items, world, **and UI** should feel like a **polished game**,
in the style of the reference (**"Fantasy Heroes: Character Editor"** — chibi heroes,
bold clean outlines, cohesive professional cartoon look), not the current
AI-storybook render.
**Why it's foundational:** locks the look everything else (B3 map, UI theme,
re-rendered avatars/anchors/items) is built against — do this decision early.
**Two routes (decision needed):**
- **(a) Adopt the Fantasy Heroes Character Editor asset/style as the character
  system.** It natively supports **layered, equippable gear** → this *also* solves
  the BRD's deferred **paper-doll / "items visible on the character"** question
  (§8.5). Strong synergy. Needs: licensing/purchase, integrating the sprite layers,
  a build/equip pipeline. Likely a fixed art style (not freely AI-generated scenes).
- **(b) Re-style our AI image generation** toward this polished cartoon-game look
  (new prompt style for avatars/anchors/items) + a matching hand-built **UI theme**
  (buttons, panels, dice, HP bars, fonts). Keeps full AI flexibility for scenes.
**Scope when chosen:** re-render avatars + anchors + items in the new style; redesign
the UI theme to match; write a short art bible so future episodes stay consistent.
**Decisions:** buy/use the asset pack vs pure-AI? budget? Does (a)'s fixed character
look limit story variety? This revisits BRD §8.5 (paper-doll) and the image-prompt
style in `render.js`.

---

## B5 — Inventory as its own screen  ·  S · ✅ DONE  ·  *feature*
Items found through the journey shown in a dedicated **slot-grid** screen (like the
reference's item grid), reached from a menu button — not the current inline chips.
Tap a slot → item detail (name, effect). Reuses the `slot` styling + rendered item
images; empty slots shown. Small and well-scoped.

## Suggested sequencing
1. **B1** now — tiny, clear regression fix.
2. **B4 decision** next — it's foundational; the art route (asset vs AI) gates B3's
   map art and the UI redesign. Worth settling before more visual work.
3. **B2** — independent of art; can land in parallel; big feel improvement.
4. **B3** — largest; build after the art direction (B4) is locked.

## Already known / tracked elsewhere (not re-listed here)
Shake-to-roll, level-up **perk choice** (currently auto stat-bump), app icon/splash,
SFX/music, CDN content delivery, episodes 2–3 — all in [build-status] / BRD as
planned follow-ups.
