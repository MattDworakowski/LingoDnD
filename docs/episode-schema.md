# Episode schema (`episode.json`)

The machine-readable form of an episode — authored by Claude, consumed by both the
**render pipeline** (to generate audio + images) and the **app** (to play it).
Extends the predecessor's `story.json` with classes, mini-games, combat, and items.
One folder per episode: `content/<episode-id>/episode.json` + rendered media beside it.

## Top level
```jsonc
{
  "id": "episode-01",
  "campaign": "sternstein",     // ties episodes into one campaign
  "episode": 1,
  "title": "Der gestohlene Sternstein",
  "language": "de",
  "startScene": "scene_1",
  "revealImages": "afterAudio", // "afterAudio" (default, comprehension reward) | "onStart"
  "mapImage": "map.png",        // overworld map for MapPlayScreen (B3); rendered from mapPrompt
  "mapPrompt": "a tall vertical fantasy adventure region ...", // prompt for the map art
  "anchors": { /* id -> { prompt, file } */ },   // reusable single-subject images
  "items":   { /* id -> { name, slot, file, prompt, bonus? } */ },
  "scenes":  { /* id -> Scene */ }
}
```

## Scene
Every scene has spoken narration and **exactly one** `then` (what happens after the
audio). Narration is second-person "du" (single gender-neutral audio).

```jsonc
"scene_3": {
  "narration": "Du verlässt die Halle. ...",  // the spoken text
  "audio": "scene_3.mp3",                       // rendered file
  "anchor": "magier",                           // optional image to reveal
  "grantItem": "silberner_schluessel",          // optional: add item on enter
  "map": { "x": 0.55, "y": 0.72 },              // optional: SPINE node on the map (B3)
  "then": { /* one transition, see below */ }
}
```

**Map nodes (B3).** A scene with a `map` (normalized 0–1 coords) is a **spine
node** the hero walks to on the overworld map; the camera pans to it and its
scene plays in a modal. Scenes **without** `map` are branch/combat sub-scenes —
they resolve in the same modal at the current node (so the hero only ever walks
the spine, never the branches). Author spine scenes **in journey order** (the app
reads node order from scene insertion order).

**Class-adaptive scene** — narration varies by the player's class (Krieger / Magier
/ Barde); all variants merge to the same `then`:
```jsonc
"scene_4": {
  "narrationByClass": {
    "krieger": { "text": "Du bist stark. Du packst einen Baumstamm ...", "audio": "scene_4_krieger.mp3" },
    "magier":  { "text": "Du sprichst einen Zauber, und Eis ...",        "audio": "scene_4_magier.mp3" },
    "barde":   { "text": "Am Ufer sitzt ein Fährmann ...",               "audio": "scene_4_barde.mp3" }
  },
  "then": { "type": "next", "next": "scene_5" }
}
```

**Terminal scene** — `{ "then": { "type": "ending" } }` (triggers level-up + "next
episode" UI).

## `then` transitions
```jsonc
// linear
{ "type": "next", "next": "scene_5" }

// d20 SKILL CHECK — pure d20 (no stat bonus), branch-and-merge
{ "type": "skillcheck", "skill": "Wahrnehmung",
  "prompt": "Würfle für Wahrnehmung – findest du die Spur?",
  "branches": [ { "min": 1, "max": 9, "next": "scene_3b" },
                { "min": 10, "max": 20, "next": "scene_3a" } ] }   // must tile 1..20

// MINI-GAME — comprehension/memory, correct = XP, both answers proceed (no block)
{ "type": "minigame", "kind": "memory",   // "memory" | "comprehension"
  "question": "Welche Farbe hatte der Umhang des Diebes?",
  "options": ["Grün", "Rot", "Blau"], "correct": 0, "xp": 1,
  "next": "scene_3" }

// COMBAT — d20 + stat bonus vs hitTarget; player HP resets after; NO game over
{ "type": "combat",
  "enemy": { "name": "Kobold", "hp": 6, "hitTarget": 9, "damage": 2, "anchor": "kobold" },
  "playerHitDamage": 3,
  "talkOut": { "stat": "charisma", "target": 12, "next": "scene_6_talk" }, // Barde only
  "winNext": "scene_6_win" }

// ENDING
{ "type": "ending" }
```

## Rules (validated before render — ported from predecessor)
- `startScene` exists; every `next` / branch / `winNext` / `talkOut.next` targets an
  existing scene; the episode has a reachable `ending`; no orphan scenes.
- `skillcheck.branches` tile **1..20** with no gaps/overlaps.
- Each scene has audio (or `audioByClass` for every class) and exactly one `then`.
- Every referenced `anchor` / `item` exists in the top-level maps.
- Any `scene.map` has `x` and `y` as numbers in 0..1.
