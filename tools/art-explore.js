"use strict";

/* ---------------------------------------------------------------------------
 * art-explore.js — one-off: render the SAME subjects across several art styles
 * so we can compare directions for B4 (see docs/backlog.md) before committing.
 * Output: art-explore/<style>__<subject>.png   (idempotent; skips existing)
 *   node tools/art-explore.js
 * ------------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "art-explore");

// --- tiny .env loader ---
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

async function openAiImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (.env).");
  for (let i = 0; i < 3; i++) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", background: "transparent" }),
    });
    if (res.ok) return Buffer.from((await res.json()).data[0].b64_json, "base64");
    const body = await res.text();
    if (res.status < 500 && res.status !== 429) throw new Error(`OpenAI ${res.status}: ${body}`);
    await sleep(1500 * (i + 1));
  }
  throw new Error("OpenAI image failed after retries.");
}

// Three polished directions to compare for B4.
const STYLES = {
  chibi:
    ", cute chibi 2D fantasy game character, big head and small body, bold clean black outlines, smooth cel shading, vibrant saturated colours, polished professional mobile game sprite, centered single subject, transparent background, no text",
  painterly:
    ", polished painterly cartoon game art, soft rendered shading and gentle highlights, warm rich colours, high-quality mobile game illustration like a modern card game, centered single subject, transparent background, no text",
  flat:
    ", clean flat vector illustration, bold flat colours, thick uniform outlines, minimal soft shading, crisp modern mobile game art style, centered single subject, transparent background, no text",
};

// Same subjects across every style (hero + enemy + item) to judge cohesion.
const SUBJECTS = {
  hero: "a brave young hero fighter with light leather armour, holding a sword and a round wooden shield, friendly fantasy adventurer",
  kobold: "a small mischievous green goblin (kobold) with pointy ears holding a little wooden club, grumpy but not scary, a bit comical",
  key: "an ornate antique silver key with a small gem",
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [styleName, styleSuffix] of Object.entries(STYLES)) {
    for (const [subjName, subjPrompt] of Object.entries(SUBJECTS)) {
      const out = path.join(OUT_DIR, `${styleName}__${subjName}.png`);
      if (fs.existsSync(out)) {
        console.log(`skip  ${path.basename(out)}`);
        continue;
      }
      console.log(`▶     ${path.basename(out)}`);
      fs.writeFileSync(out, await openAiImage(subjPrompt + styleSuffix));
    }
  }
  console.log("\nDone. Compare images in art-explore/");
}

main().catch((e) => {
  console.error("\n✖ " + e.message);
  process.exit(1);
});
