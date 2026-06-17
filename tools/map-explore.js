"use strict";

/* ---------------------------------------------------------------------------
 * map-explore.js — one-off sample maps for B3 (overworld board). Renders a
 * couple of Episode-1 journey maps to art-explore/ so we can judge the look
 * before building the map player. Idempotent.
 *   node tools/map-explore.js
 * ------------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "art-explore");

(function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
})(path.join(ROOT, ".env"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openAiImage(prompt, size, quality = "auto") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (.env).");
  for (let i = 0; i < 3; i++) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size, quality, background: "auto" }),
    });
    if (res.ok) return Buffer.from((await res.json()).data[0].b64_json, "base64");
    const body = await res.text();
    if (res.status < 500 && res.status !== 429) throw new Error(`OpenAI ${res.status}: ${body}`);
    await sleep(1500 * (i + 1));
  }
  throw new Error("OpenAI image failed after retries.");
}

const CHIBI =
  ", polished 2D fantasy mobile game illustration, bold clean outlines, cel shading, " +
  "vibrant saturated colours, charming storybook adventure map, no text, no labels, consistent style.";

// Episode 1's route, bottom -> top.
const ROUTE =
  "a children's fantasy adventure journey map, a clear winding trail leading from the " +
  "bottom to the top: at the bottom a cosy mountain hall village, up through a green " +
  "forest, across a river with a small broken wooden bridge, past a dark mysterious " +
  "grove, through a narrow rocky pass, by a small campfire clearing, up to tall misty " +
  "mountains at the very top, distinct landmarks connected by the path";

const DETAIL_PROMPT =
  "An extremely detailed comic fantasy game world map, top-down board-game style, " +
  "packed with points of interest and things to explore: a grand central castle on a " +
  "hill, many villages and red-roofed farmhouses, a wizard tower, ancient standing-" +
  "stone ruins, a deep river canyon with a wooden bridge, winding roads connecting " +
  "everything, a campfire camp, a windmill, a small harbour with docks and boats, " +
  "caves and mine entrances in rocky hills, a graveyard, a forest shrine, ponds and a " +
  "waterfall, hidden treasure chests, small monster lairs, dense varied forests, rocky " +
  "snowy mountains, lots of tiny charming details everywhere, vibrant cartoon colours, " +
  "bold clean outlines, intricate richly detailed illustration, fills the whole frame " +
  "edge to edge, no text, no labels, no border.";

const VARIED_PROMPT =
  "A highly detailed and richly VARIED comic fantasy world map, Adventure-Time " +
  "inspired hand-drawn cartoon style, slightly isometric top-down view. Strong visual " +
  "variety: many DIFFERENT kinds of trees (round oaks, tall pine conifers, autumn " +
  "orange trees, white birches, willows, a few palm trees, mushroom trees) and many " +
  "DIFFERENT unique buildings (thatched cottages, timber-framed houses, a grand " +
  "castle, a stone wizard tower, a windmill, a coastal lighthouse, a smoking " +
  "blacksmith, a market with stalls, a temple, a small harbour with docks and varied " +
  "boats). Unique scattered landmarks: a giant carved-stone face mountain, ancient " +
  "standing-stone ruins, a graveyard, a sleeping dragon on a hill, a frozen snowy " +
  "area, a swamp with a hut, a small desert patch with cacti, a volcano, caves and " +
  "mine entrances, treasure chests, ponds and waterfalls. Winding roads and rivers " +
  "connect everything, a coastline with the sea. No repeated assets, every tree and " +
  "house distinct, lots of charming detail. Muted natural colours, thin clean " +
  "outlines, intricate. Fills the frame edge to edge, no text, no labels, no border.";

const MAPS = {
  map_journey: { prompt: `Top-down storybook board-game view of ${ROUTE}${CHIBI}`, size: "1024x1536" },
  map_iso: { prompt: `Isometric RPG overworld view of ${ROUTE}${CHIBI}`, size: "1024x1536" },

  // Richer, denser whole-world maps (user reference): more scale + detail, meant
  // to be panned across. No border (continuous world), fills the frame.
  map_world_board: {
    prompt:
      "A highly detailed comic fantasy game world map, top-down board-game style, a large rich kingdom with a great castle on a hill, dense forests, winding rivers and a deep river canyon with a small bridge, several villages, ancient ruins, a wizard tower, a campfire camp, rocky mountains with snowy peaks, many small landmarks and points of interest, vibrant cartoon colours, bold clean outlines, intricate richly detailed illustration, fills the whole frame edge to edge, no text, no labels, no border.",
    size: "1536x1024",
    quality: "high",
  },
  map_world_iso: {
    prompt:
      "A highly detailed cartoon fantasy overworld map, slight isometric top-down view, a sprawling green continent with rocky mountains and snowy peaks, dense forests, winding rivers and lakes with small bridges, many small villages and castles, ancient ruins, a wizard tower, a campfire camp, a coastline with the sea and a few sailing ships, lots of small landmarks and points of interest, playful Adventure-Time inspired clean cartoon style, bold outlines, vibrant colours, intricate and richly detailed, fills the whole frame edge to edge, no text, no labels, no border.",
    size: "1024x1536",
    quality: "high",
  },

  // Denser, higher-detail board maps (user: more POIs, things to explore — we'll
  // zoom into each area). Two compositions to compare.
  map_world_detail_a: { prompt: DETAIL_PROMPT, size: "1536x1024", quality: "high" },
  map_world_detail_b: { prompt: DETAIL_PROMPT, size: "1536x1024", quality: "high" },

  // More VARIED assets (user: different trees/houses, unique landmarks, less repetition).
  map_varied_a: { prompt: VARIED_PROMPT, size: "1536x1024", quality: "high" },
  map_varied_b: { prompt: VARIED_PROMPT, size: "1024x1536", quality: "high" },
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, { prompt, size, quality }] of Object.entries(MAPS)) {
    const out = path.join(OUT_DIR, `${name}.png`);
    if (fs.existsSync(out)) {
      console.log(`skip  ${name}.png`);
      continue;
    }
    console.log(`▶     ${name}.png`);
    fs.writeFileSync(out, await openAiImage(prompt, size, quality));
  }
  console.log("\nDone. See art-explore/map_*.png");
}

main().catch((e) => {
  console.error("\n✖ " + e.message);
  process.exit(1);
});
