// Game state: the character build + campaign progress, persisted on-device
// (no accounts, no cloud — see BRD §12/§13).
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { characters, ClassId, Gender, StatId } from "./content";

export interface Character {
  gender: Gender;
  classId: ClassId;
  level: number;
  xp: number; // xp toward the next level
  stats: Record<StatId, number>;
  maxHp: number;
  items: string[];
  flags: Record<string, boolean>;
}
export interface Progress { episodeId: string; sceneId: string }
interface SaveData { character: Character | null; progress: Progress | null; completed: string[] }

const KEY = "lingodnd:save:v1";
const XP_PER_LEVEL = 3;

interface Ctx {
  loaded: boolean;
  character: Character | null;
  progress: Progress | null;
  completed: string[]; // ids of episodes finished (reached their ending)
  createCharacter: (gender: Gender, classId: ClassId) => void;
  addXp: (n: number) => boolean; // true if the character leveled up
  grantItem: (id: string) => void;
  setProgress: (p: Progress | null) => void;
  markCompleted: (episodeId: string) => void;
  resetAll: () => void;
}

const GameContext = createContext<Ctx | null>(null);
export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame must be used inside <GameProvider>");
  return c;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [character, setCharacter] = useState<Character | null>(null);
  const [progress, setProgressState] = useState<Progress | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          const d: SaveData = JSON.parse(raw);
          setCharacter(d.character);
          setProgressState(d.progress);
          setCompleted(d.completed ?? []);
        } catch {
          /* corrupt save — start fresh */
        }
      }
      setLoaded(true);
    });
  }, []);

  function persist(char: Character | null, prog: Progress | null, comp: string[]) {
    AsyncStorage.setItem(KEY, JSON.stringify({ character: char, progress: prog, completed: comp }));
  }

  function createCharacter(gender: Gender, classId: ClassId) {
    const def = characters.classes[classId];
    const char: Character = {
      gender,
      classId,
      level: 1,
      xp: 0,
      stats: { ...def.stats },
      maxHp: characters.baseHp,
      items: [],
      flags: {},
    };
    setCharacter(char);
    setProgressState(null);
    setCompleted([]);
    persist(char, null, []);
  }

  function addXp(n: number): boolean {
    if (!character) return false;
    let xp = character.xp + n;
    let level = character.level;
    const stats = { ...character.stats };
    const primary = characters.classes[character.classId].primary;
    let leveled = false;
    while (xp >= XP_PER_LEVEL) {
      xp -= XP_PER_LEVEL;
      level += 1;
      stats[primary] += 1;
      leveled = true;
    }
    const updated: Character = { ...character, xp, level, stats };
    setCharacter(updated);
    persist(updated, progress, completed);
    return leveled;
  }

  function grantItem(id: string) {
    if (!character || character.items.includes(id)) return;
    const updated: Character = { ...character, items: [...character.items, id] };
    setCharacter(updated);
    persist(updated, progress, completed);
  }

  function setProgress(p: Progress | null) {
    setProgressState(p);
    persist(character, p, completed);
  }

  // Mark an episode finished (unlocks the next one on the Sternenreise).
  function markCompleted(episodeId: string) {
    if (completed.includes(episodeId)) return;
    const c = [...completed, episodeId];
    setCompleted(c);
    persist(character, progress, c);
  }

  function resetAll() {
    setCharacter(null);
    setProgressState(null);
    setCompleted([]);
    AsyncStorage.removeItem(KEY);
  }

  return (
    <GameContext.Provider
      value={{ loaded, character, progress, completed, createCharacter, addXp, grantItem, setProgress, markCompleted, resetAll }}
    >
      {children}
    </GameContext.Provider>
  );
}
