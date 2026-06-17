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
interface SaveData { character: Character | null; progress: Progress | null }

const KEY = "lingodnd:save:v1";
const XP_PER_LEVEL = 3;

interface Ctx {
  loaded: boolean;
  character: Character | null;
  progress: Progress | null;
  createCharacter: (gender: Gender, classId: ClassId) => void;
  addXp: (n: number) => boolean; // true if the character leveled up
  grantItem: (id: string) => void;
  setProgress: (p: Progress | null) => void;
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

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          const d: SaveData = JSON.parse(raw);
          setCharacter(d.character);
          setProgressState(d.progress);
        } catch {
          /* corrupt save — start fresh */
        }
      }
      setLoaded(true);
    });
  }, []);

  function persist(char: Character | null, prog: Progress | null) {
    AsyncStorage.setItem(KEY, JSON.stringify({ character: char, progress: prog }));
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
    persist(char, null);
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
    persist(updated, progress);
    return leveled;
  }

  function grantItem(id: string) {
    if (!character || character.items.includes(id)) return;
    const updated: Character = { ...character, items: [...character.items, id] };
    setCharacter(updated);
    persist(updated, progress);
  }

  function setProgress(p: Progress | null) {
    setProgressState(p);
    persist(character, p);
  }

  function resetAll() {
    setCharacter(null);
    setProgressState(null);
    AsyncStorage.removeItem(KEY);
  }

  return (
    <GameContext.Provider
      value={{ loaded, character, progress, createCharacter, addXp, grantItem, setProgress, resetAll }}
    >
      {children}
    </GameContext.Provider>
  );
}
