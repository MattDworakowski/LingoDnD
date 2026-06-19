// Loads the hand-authored content (episodes, characters) and resolves bundled
// media through the generated asset registry. See docs/episode-schema.md.
import charactersJson from "../content/characters.json";
import episode01Json from "../content/episode-01/episode.json";
import episode02Json from "../content/episode-02/episode.json";
import manifestJson from "../content/index.json";
import { asset } from "./generated/assets";

export type ClassId = "krieger" | "magier" | "barde";
export type Gender = "junge" | "maedchen";
export type StatId = "staerke" | "magie" | "charisma";

export interface Branch { min: number; max: number; next: string }
export interface Enemy { name: string; hp: number; hitTarget: number; damage: number; anchor?: string }
export type Then =
  | { type: "next"; next: string }
  | { type: "minigame"; kind: string; question: string; options: string[]; correct: number; xp: number; next: string }
  | { type: "skillcheck"; skill: string; prompt: string; branches: Branch[] }
  | { type: "combat"; enemy: Enemy; playerHitDamage: number; talkOut?: { stat: StatId; target: number; next: string }; winNext: string }
  | { type: "ending" };

export interface ClassNarration { text: string; audio: string }
// Normalized (0–1) position on the episode map. Resolution-independent so the
// coords survive a map-art swap and the eventual campaign grid-world (B3).
export interface MapPos { x: number; y: number }
export interface Scene {
  narration?: string;
  audio?: string;
  narrationByClass?: Record<ClassId, ClassNarration>;
  anchor?: string;
  grantItem?: string;
  map?: MapPos; // present only on SPINE scenes → a node on the map (B3)
  then: Then;
}
export interface ItemDef { name: string; slot: string; file: string; desc?: string; bonus?: string }
export interface Episode {
  id: string;
  campaign: string;
  episode: number;
  title: string;
  startScene: string;
  revealImages?: "afterAudio" | "onStart";
  mapImage?: string; // the episode's overworld map (B3)
  anchors: Record<string, { prompt: string; file: string }>;
  items: Record<string, ItemDef>;
  scenes: Record<string, Scene>;
}
export interface ClassDef { name: string; primary: StatId; blurb: string; stats: Record<StatId, number> }
export interface CharactersConfig {
  stats: StatId[];
  baseHp: number;
  classes: Record<ClassId, ClassDef>;
  genders: Gender[];
  avatars: Record<string, { prompt: string; file: string }>;
}

export const characters = charactersJson as unknown as CharactersConfig;
export const manifest = manifestJson as { episodes: { id: string; title: string; cover: string; episode: number }[] };

const EPISODES: Record<string, Episode> = {
  "episode-01": episode01Json as unknown as Episode,
  "episode-02": episode02Json as unknown as Episode,
};
export const FIRST_EPISODE = "episode-01";
export function getEpisode(id: string): Episode { return EPISODES[id] ?? EPISODES[FIRST_EPISODE]; }

// Episodes in campaign order (by `episode` number).
export function episodesInOrder(): Episode[] {
  return Object.values(EPISODES).sort((a, b) => a.episode - b.episode);
}
// The next episode after `id`, or null if this is the last one.
export function nextEpisodeId(id: string): string | null {
  const all = episodesInOrder();
  const i = all.findIndex((e) => e.id === id);
  return i >= 0 && i + 1 < all.length ? all[i + 1].id : null;
}

export const CLASS_IDS: ClassId[] = ["krieger", "magier", "barde"];
export const GENDER_LABELS: Record<Gender, string> = { junge: "Junge", maedchen: "Mädchen" };
export const STAT_LABELS: Record<StatId, string> = { staerke: "Stärke", magie: "Magie", charisma: "Charisma" };

// --- asset helpers (return a require() module id, or undefined if not rendered) ---
export function sceneAudio(epId: string, scene: Scene, cls: ClassId): number | undefined {
  const file = scene.narrationByClass ? scene.narrationByClass[cls].audio : scene.audio;
  return file ? asset(`${epId}/${file}`) : undefined;
}
export function sceneText(scene: Scene, cls: ClassId): string {
  return scene.narrationByClass ? scene.narrationByClass[cls].text : scene.narration ?? "";
}
export function anchorImage(ep: Episode, anchorId?: string): number | undefined {
  if (!anchorId) return undefined;
  const a = ep.anchors[anchorId];
  return a ? asset(`${ep.id}/${a.file}`) : undefined;
}
export function itemDef(ep: Episode, itemId: string) { return ep.items[itemId]; }
export function itemImage(ep: Episode, itemId: string): number | undefined {
  const it = ep.items[itemId];
  return it ? asset(`${ep.id}/${it.file}`) : undefined;
}
export function coverImage(epId: string): number | undefined { return asset(`${epId}/cover.png`); }
export function avatarImage(cls: ClassId, gender: Gender): number | undefined {
  return asset(`characters/${cls}_${gender}.png`);
}
export function mapImage(ep: Episode): number | undefined {
  return ep.mapImage ? asset(`${ep.id}/${ep.mapImage}`) : undefined;
}

// The ordered spine nodes (scenes carrying a `map` position). Relies on
// episode.json listing scenes in spine order (insertion order is preserved).
export interface MapNode { id: string; pos: MapPos; index: number }
export function spineNodes(ep: Episode): MapNode[] {
  return Object.entries(ep.scenes)
    .filter(([, s]) => !!s.map)
    .map(([id, s], index) => ({ id, pos: s.map!, index }));
}
