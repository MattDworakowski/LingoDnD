"use strict";

/* ---------------------------------------------------------------------------
 * render.js — content pipeline for LingoDnD (adapted from the dnd-story-app
 * predecessor for the richer episode schema; see docs/episode-schema.md).
 *
 *   node render.js            # validate every episode + render missing audio
 *   node render.js --images   # ...also render missing anchor/item/cover/avatar images
 *
 * Episodes are hand-authored (Claude writes content/<id>/episode.json). This
 * script never writes story text — it validates the graph and produces media.
 * Idempotent: any asset whose file already exists is skipped.
 *
 * Keys come from a gitignored .env at the repo root (see .env.example):
 *   ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID), OPENAI_API_KEY.
 * ------------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.join(__dirname, "content");
const CHARACTERS_FILE = path.join(CONTENT_DIR, "characters.json");
const RENDER_IMAGES = process.argv.includes("--images");

// --- tiny .env loader so `node render.js` just works when .env exists ---
loadEnv(path.join(__dirname, ".env"));
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch with retry on transient failures (network / 429 / 5xx). 4xx throws at once.
async function apiFetch(url, opts, label, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) { console.log(`    retry ${label} (network)…`); await sleep(1500 * (i + 1)); continue; }
      throw lastErr;
    }
    if (res.ok) return res;
    const body = await res.text();
    const err = new Error(`${label} ${res.status}: ${body}`);
    if (res.status < 500 && res.status !== 429) throw err; // client error — don't retry
    lastErr = err;
    if (i < tries - 1) { console.log(`    retry ${label} (${res.status})…`); await sleep(1500 * (i + 1)); }
  }
  throw lastErr;
}

// Friendly storybook style anchors keep a story's art consistent and on-tone
// (warm, not scary — see docs/tone-and-style-guide.md). Anchors/items/avatars
// get a transparent background; covers are opaque scenes.
// Chosen art direction (B4): polished chibi 2D game style (Fantasy Heroes-like).
const STYLE_ANCHOR =
  ", cute chibi 2D fantasy game art, bold clean black outlines, smooth cel " +
  "shading, vibrant saturated colours, polished professional mobile game sprite, " +
  "centered single subject, transparent background, no text, consistent style.";
const STYLE_COVER =
  ", polished 2D fantasy mobile game illustration, bold clean outlines, cel " +
  "shading, vibrant saturated colours, charming storybook game scene, no text, " +
  "consistent style.";

/* ===========================================================================
 * TTS — ElevenLabs eleven_multilingual_v2, ~10% slow for a young learner.
 * Kept behind one swappable function.
 * ========================================================================= */
const ELEVEN_MODEL = "eleven_multilingual_v2";
const DEFAULT_VOICE_ID = "0oTMoyM0wBOiv66gewih"; // native-German; override with ELEVENLABS_VOICE_ID

async function elevenLabsTTS(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set (add it to .env).");
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const res = await apiFetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true, speed: 0.9 },
      }),
    },
    "ElevenLabs"
  );
  return Buffer.from(await res.arrayBuffer());
}

const synthesizeSpeech = elevenLabsTTS;

/* ===========================================================================
 * Image provider — OpenAI gpt-image-1. Returns a PNG Buffer.
 * ========================================================================= */
async function openAiImage(prompt, { transparent, size = "1024x1024" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (add it to .env).");

  const res = await apiFetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        background: transparent ? "transparent" : "auto",
      }),
    },
    "OpenAI image"
  );
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, "base64");
}

/* ===========================================================================
 * Validation — fail loudly before rendering anything.
 * ========================================================================= */
const CLASSES = ["krieger", "magier", "barde"];

// The scene ids a scene can transition to (for reachability + link checks).
function transitionsOf(scene) {
  const t = scene.then || {};
  switch (t.type) {
    case "next": return [t.next];
    case "minigame": return [t.next];
    case "skillcheck": return (t.branches || []).map((b) => b.next);
    case "combat": return [t.winNext, t.talkOut && t.talkOut.next].filter(Boolean);
    case "ending": return [];
    default: return [];
  }
}

function validateEpisode(ep, id) {
  const errors = [];
  const scenes = ep.scenes || {};
  const ids = Object.keys(scenes);
  const has = (sid) => Object.prototype.hasOwnProperty.call(scenes, sid);

  if (!ep.startScene || !has(ep.startScene)) {
    errors.push(`startScene "${ep.startScene}" is missing or unknown.`);
  }

  for (const [sid, scene] of Object.entries(scenes)) {
    // narration + audio, or narrationByClass with text+audio per class
    if (scene.narrationByClass) {
      for (const cls of CLASSES) {
        const v = scene.narrationByClass[cls];
        if (!v || !v.text || !v.audio) {
          errors.push(`scene "${sid}".narrationByClass is missing text/audio for "${cls}".`);
        }
      }
    } else {
      if (!scene.narration) errors.push(`scene "${sid}" has no narration.`);
      if (!scene.audio) errors.push(`scene "${sid}" has no audio filename.`);
    }

    if (scene.anchor && !(ep.anchors && ep.anchors[scene.anchor])) {
      errors.push(`scene "${sid}".anchor -> "${scene.anchor}" not in anchors map.`);
    }
    if (scene.grantItem && !(ep.items && ep.items[scene.grantItem])) {
      errors.push(`scene "${sid}".grantItem -> "${scene.grantItem}" not in items map.`);
    }

    const t = scene.then;
    if (!t || !t.type) {
      errors.push(`scene "${sid}" must have a "then" with a type.`);
      continue;
    }
    if (t.type === "skillcheck") {
      errors.push(...coverageErrors(t.branches || [], sid));
    }
    if (t.type === "minigame") {
      const n = (t.options || []).length;
      if (n < 2) errors.push(`scene "${sid}" minigame needs at least 2 options.`);
      if (!(t.correct >= 0 && t.correct < n)) errors.push(`scene "${sid}" minigame.correct out of range.`);
    }
    if (t.type === "combat" && (!t.enemy || !t.winNext)) {
      errors.push(`scene "${sid}" combat needs an enemy and winNext.`);
    }
    // every referenced target scene must exist
    for (const next of transitionsOf(scene)) {
      if (!has(next)) errors.push(`scene "${sid}" -> "${next}" does not exist.`);
    }
  }

  // Reachability from startScene; flag orphans and ensure an ending exists.
  const reachable = reachableScenes(ep);
  let reachableEnding = false;
  for (const sid of reachable) {
    if (scenes[sid] && scenes[sid].then && scenes[sid].then.type === "ending") reachableEnding = true;
  }
  if (!reachableEnding) errors.push("no reachable scene with a then.type === \"ending\".");
  for (const sid of ids) {
    if (!reachable.has(sid)) errors.push(`scene "${sid}" is an orphan (unreachable).`);
  }

  if (errors.length) {
    throw new Error(`Validation failed for "${id}":\n  - ${errors.join("\n  - ")}`);
  }
}

// Skillcheck branches must tile 1..20 exactly: no gaps, no overlaps.
function coverageErrors(branches, sid) {
  const errs = [];
  const sorted = [...branches].sort((a, b) => a.min - b.min);
  let expected = 1;
  for (const b of sorted) {
    if (b.min !== expected) {
      errs.push(`scene "${sid}" branch coverage: expected ${expected} but next range starts at ${b.min} (gap or overlap).`);
    }
    if (b.max < b.min) errs.push(`scene "${sid}" branch has max < min.`);
    expected = b.max + 1;
  }
  if (expected !== 21) errs.push(`scene "${sid}" branch coverage ends at ${expected - 1}, must cover 1–20.`);
  return errs;
}

function reachableScenes(ep) {
  const scenes = ep.scenes || {};
  const seen = new Set();
  const stack = [ep.startScene];
  while (stack.length) {
    const sid = stack.pop();
    if (!sid || seen.has(sid) || !scenes[sid]) continue;
    seen.add(sid);
    for (const next of transitionsOf(scenes[sid])) stack.push(next);
  }
  return seen;
}

/* ===========================================================================
 * Rendering
 * ========================================================================= */
async function renderClip(out, text, label) {
  if (fs.existsSync(out)) { console.log(`    audio  skip  ${path.basename(out)}`); return; }
  console.log(`    audio  ▶     ${path.basename(out)}  (${label})`);
  fs.writeFileSync(out, await synthesizeSpeech(text));
}

async function renderImage(out, prompt, style, opts, label) {
  if (fs.existsSync(out)) { console.log(`    image  skip  ${path.basename(out)}`); return; }
  console.log(`    image  ▶     ${path.basename(out)}  (${label})`);
  fs.writeFileSync(out, await openAiImage(prompt + style, opts));
}

async function renderEpisodeAudio(ep, dir) {
  for (const [sid, scene] of Object.entries(ep.scenes)) {
    if (scene.narration) await renderClip(path.join(dir, scene.audio), scene.narration, sid);
    if (scene.narrationByClass) {
      for (const cls of CLASSES) {
        const v = scene.narrationByClass[cls];
        await renderClip(path.join(dir, v.audio), v.text, `${sid}/${cls}`);
      }
    }
  }
}

async function renderEpisodeImages(ep, dir) {
  for (const [aid, a] of Object.entries(ep.anchors || {})) {
    await renderImage(path.join(dir, a.file), a.prompt, STYLE_ANCHOR, { transparent: true }, `anchor: ${aid}`);
  }
  for (const [iid, it] of Object.entries(ep.items || {})) {
    await renderImage(path.join(dir, it.file), it.prompt, STYLE_ANCHOR, { transparent: true }, `item: ${iid}`);
  }
  if (ep.coverPrompt) {
    await renderImage(path.join(dir, "cover.png"), ep.coverPrompt, STYLE_COVER, { transparent: false }, "cover");
  } else {
    console.warn("    cover  WARN  no coverPrompt — skipping cover.png");
  }
}

async function renderAvatars() {
  if (!fs.existsSync(CHARACTERS_FILE)) return;
  const chars = JSON.parse(fs.readFileSync(CHARACTERS_FILE, "utf8"));
  const dir = path.join(CONTENT_DIR, "characters");
  fs.mkdirSync(dir, { recursive: true });
  console.log("\nRendering character avatars:");
  for (const [aid, a] of Object.entries(chars.avatars || {})) {
    await renderImage(path.join(dir, a.file), a.prompt, STYLE_ANCHOR, { transparent: true }, `avatar: ${aid}`);
  }
}

/* ===========================================================================
 * content/index.json manifest
 * ========================================================================= */
function updateManifest(episodes) {
  const manifest = {
    episodes: episodes
      .slice()
      .sort((a, b) => (a.episode || 0) - (b.episode || 0))
      .map((e) => ({ id: e.id, campaign: e.campaign, episode: e.episode, title: e.title, cover: `${e.id}/cover.png` })),
    characters: "characters.json",
  };
  fs.writeFileSync(path.join(CONTENT_DIR, "index.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nUpdated content/index.json (${episodes.length} episode(s)).`);
}

/* ===========================================================================
 * Main
 * ========================================================================= */
async function main() {
  if (!fs.existsSync(CONTENT_DIR)) throw new Error(`No content/ directory at ${CONTENT_DIR}`);

  const episodeDirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(CONTENT_DIR, d.name))
    .filter((d) => fs.existsSync(path.join(d, "episode.json")));

  if (!episodeDirs.length) { console.log("No episode.json files found under content/."); return; }

  // 1. Validate everything first — fail loudly before any rendering.
  const loaded = [];
  for (const dir of episodeDirs) {
    const ep = JSON.parse(fs.readFileSync(path.join(dir, "episode.json"), "utf8"));
    validateEpisode(ep, ep.id);
    loaded.push({ ep, dir });
    console.log(`Validated "${ep.id}" ✓`);
  }

  // 2–3. Render media.
  for (const { ep, dir } of loaded) {
    console.log(`\nRendering "${ep.id}":`);
    await renderEpisodeAudio(ep, dir);
    if (RENDER_IMAGES) await renderEpisodeImages(ep, dir);
  }
  if (RENDER_IMAGES) await renderAvatars();

  // 4. Manifest.
  updateManifest(loaded.map((l) => l.ep));

  if (!RENDER_IMAGES) console.log("\n(audio only — run `node render.js --images` to add pictures)");
  console.log("Done.");
}

main().catch((err) => {
  console.error("\n✖ " + err.message);
  process.exit(1);
});
