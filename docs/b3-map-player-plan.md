# B3 — Overworld Map Player: Plan

Status: **P1 + P2 done**; P3 (campaign grid) later. The bespoke Ep-1 map render
is pending (OpenAI billing hard limit) — still on the placeholder; once rendered,
re-tune the 7 node coords to its landmarks. See [backlog B3](backlog.md),
[BRD](../BRD.md), [episode schema](episode-schema.md). This is the authoritative
plan for the overworld-map feature; the backlog entry links here.

## The decision (and why)

Two compatible visions came up:

1. **Grid-of-episodes (campaign north star)** — one giant Aldoria world map (in
   the style of `art-explore/map_world_detail_b.png`) chopped into a grid of
   cells, each cell an episode.
2. **Per-episode rich map** — each episode gets its own rich isometric map
   (detail_b style), zoomed in, that **fog-uncovers and pans** as the episode
   plays out.

**We build Vision 2 first.** The deciding factor is resolution: gpt-image-1 caps
at ~1536px. If the whole campaign is one image cut into a grid, each episode cell
is a tiny slice of 1536px — too low-res to play a ~12-min episode inside. A
per-episode map gives each region the full ~1536px at full quality, and it is
**not a throwaway**: these per-episode regions are exactly the tiles that later
compose into the grid-world.

Resulting order:

- **Now:** per-episode rich map = where the episode is actually played.
- **Later:** a zoomed-out **campaign-overview grid** (low detail, navigational —
  pick/track episodes as regions of Aldoria). The overview tolerates low res
  because you don't play *inside* it. Eventually upscale / tile / commission a
  true giant crisp world map.

## P1 — scope (build now)

1. **Schema** — per spine scene, add normalized map coords `map: { x, y }`
   (0–1, resolution-independent so they survive a map-art swap and the eventual
   grid-world). Add a per-episode `mapImage`. Document in
   [episode-schema.md](episode-schema.md).
2. **Episode-1 map art** — one rich detail_b-style map whose landmarks match
   Ep-1's spine (mountain-hall village → forest → broken bridge over river →
   dark grove → rocky pass → campfire clearing → misty peaks) so nodes land on
   real features. Generated via the render pipeline (`mapPrompt` + `STYLE_MAP`
   in `render.js`, rendered to `content/episode-01/map.png`). *(Built first
   against the placeholder `art-explore/map_journey.png` — its bottom→top route
   already matches Ep-1's beats, so the authored node coords stay meaningful;
   the bespoke richer detail_b-style render is slotted in when we spend the
   credits.)*
3. **`MapPlayScreen`** — map image + node markers at the normalized coords, a
   hero token walking node→node, camera **auto-pan** to the active node, and the
   scene content (narration, dice, mini-games, combat) moved into a **modal**
   over the map. The existing linear `PlayScreen` stays as a fallback.

## P2 — ✅ done (dependency-free: no svg/gradient/gesture libs)

- **Zoom** — a `scale` transform on the map layer (camera math is scale-aware +
  clamped). Auto: pulls back to `Z_TRAVEL` to frame the trip while walking, zooms
  back to `Z_REST` on arrival. (No pinch gesture — would need react-native-gesture-handler.)
- **Path-drawing art** — a dotted trail along the whole spine; walked segments
  gold, upcoming segments cream.
- **Transitions** — the tray slides up + fades in on open; the hero does a little
  landing bounce on arrival; camera pull-back/zoom-in frames each leg.
- **Fog-of-war — tried, then removed (by choice).** Built a receding dark band,
  then per-node "cloud puffs that clear"; both felt awkward/heavy for the value,
  and the board reads fine without it. Not worth re-adding without a genuinely
  nice effect (would likely need svg/gradient for soft mist).

## P3 — later

- Campaign-overview grid screen (all episodes as regions of Aldoria).
- True giant crisp world map (upscale / tile / commission past the 1536px cap).

## Notes

- Branch-and-merge stays intact: the map shows only **spine** nodes; branches,
  dice, and combat resolve *inside* the scene modal, so the hero always walks the
  spine (avoids the branch-layout problem).
- API keys: rotate **after** this build (deferred by user); building first.
