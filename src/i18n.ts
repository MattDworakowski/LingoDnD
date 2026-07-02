// UI chrome strings (buttons, labels, dialogs) in German + English. This is the
// app-level half of the bilingual A/B test — content (episode narration, item
// names, class names) is localized separately via `loc()` in content.ts.
//
// Bound to the current language through `useT()`, which reads `lang` from game
// state. German strings are kept verbatim from the original hard-coded UI.
import { Lang } from "./content";
import { useGame } from "./state";

export interface Strings {
  // Home — tabs + Reise (constellation)
  tabReise: string;
  tabHeld: string;
  constellation: string; // "Dein Sternbild"
  journeyContinues: string; // "✦ …die Reise geht weiter"
  youAreHere: string;
  episode: (n: number) => string;
  locked: string; // "Bald"
  ctaBegin: string;
  ctaContinue: string;
  ctaReplay: string;
  ctaTravelOn: string;
  ctaStart: string; // "Los geht's ✦"
  statusCompleted: string;
  statusReady: string;
  sceneXofY: (n: number, total: number) => string;

  // Held (character)
  held: string;
  level: (n: number) => string; // "STUFE n"
  hp: (hp: number) => string; // "❤️ n HP"
  xpToNext: (nextLevel: number, xp: number) => string;
  starPouch: string; // "Sternen-Beutel"
  noTreasures: string;
  newHero: string;
  resetTitle: string;
  resetBody: string;
  cancel: string;
  delete: string;
  close: string;
  language: string;

  // Create
  createOverline: string;
  createTitle: string;
  mainPower: string; // "Hauptkraft:"
  letsGo: string; // "Los geht's ✦"

  // Map / Play chrome
  backJourney: string; // "‹ Reise"
  theStory: string; // "✦ Die Geschichte"

  // Scene — audio dock
  readingAloud: string; // "wird vorgelesen…"
  a11yPause: string;
  a11yResume: string;
  a11yReplay: string;
  a11ySkip: string;
  a11yNext: string;
  a11yListen: string;

  // Dice
  rollStars: string; // "✦ Sterne würfeln"
  rollHigh: string; // "Würfle hoch – hohe Zahlen sind gut!"

  // Mini-game
  starQuestion: string; // "✦ Sternenfrage"
  correctFeedback: string;
  wrongFeedback: string;
  tapAnswer: string;

  // Combat
  combatIntro: (enemy: string) => string;
  combatDefeated: (enemy: string) => string;
  combatDown: string;
  combatStrikesBack: (enemy: string, dmg: number) => string;
  combatHit: (roll: number, bonus: number, total: number, target: number, enemy: string, dmg: number) => string;
  combatMiss: (roll: number, bonus: number, total: number, target: number) => string;
  combatFireball: (enemy: string) => string;
  talkWin: (roll: number, cha: number, total: number, target: number) => string;
  talkFail: (roll: number, cha: number, total: number, enemy: string) => string;
  attackPrompt: string;
  talkPrompt: string;
  fireball: string; // "🔥 Feuerball"
  talkAction: string; // "💬 Reden"
  you: string; // combat HP row label for the player

  // Ending + banners
  toBeContinued: string;
  toJourney: string;
  levelUpTitle: (n: number) => string;
  mainPowerGrew: string;
  tapToClose: string;
  found: string; // "✦ Gefunden!"
}

const de: Strings = {
  tabReise: "Reise",
  tabHeld: "Held",
  constellation: "Dein Sternbild",
  journeyContinues: "✦ …die Reise geht weiter",
  youAreHere: "DU BIST HIER",
  episode: (n) => `Episode ${n}`,
  locked: "Bald",
  ctaBegin: "Reise beginnen ✦",
  ctaContinue: "Weiterspielen ✦",
  ctaReplay: "Nochmal hören ✦",
  ctaTravelOn: "Weiterreisen ✦",
  ctaStart: "Los geht's ✦",
  statusCompleted: "Abgeschlossen ✓",
  statusReady: "Bereit für die Reise",
  sceneXofY: (n, total) => `Szene ${n} von ${total}`,

  held: "Held",
  level: (n) => `STUFE ${n}`,
  hp: (hp) => `❤️ ${hp} HP`,
  xpToNext: (nextLevel, xp) => `EP bis Stufe ${nextLevel} · ${xp}/3`,
  starPouch: "Sternen-Beutel",
  noTreasures: "Noch keine Schätze gefunden.",
  newHero: "Neuen Helden erstellen",
  resetTitle: "Neuen Helden erstellen?",
  resetBody: "Dein aktueller Held und dein Fortschritt gehen dabei verloren.",
  cancel: "Abbrechen",
  delete: "Löschen",
  close: "Schließen",
  language: "Sprache",

  createOverline: "Dein Abenteuer beginnt",
  createTitle: "Erstelle deinen Helden",
  mainPower: "Hauptkraft:",
  letsGo: "Los geht's ✦",

  backJourney: "‹ Reise",
  theStory: "✦ Die Geschichte",

  readingAloud: "wird vorgelesen…",
  a11yPause: "Pause",
  a11yResume: "Weiter abspielen",
  a11yReplay: "Nochmal anhören",
  a11ySkip: "Überspringen",
  a11yNext: "Weiter",
  a11yListen: "Nochmal hören",

  rollStars: "✦ Sterne würfeln",
  rollHigh: "Würfle hoch – hohe Zahlen sind gut!",

  starQuestion: "✦ Sternenfrage",
  correctFeedback: "Richtig! +1 EP ✦",
  wrongFeedback: "Schau beim nächsten Mal genau hin.",
  tapAnswer: "Tippe die richtige Antwort an",

  combatIntro: (enemy) => `Ein ${enemy} versperrt den Weg!`,
  combatDefeated: (enemy) => `Du hast den ${enemy} besiegt! 🎉`,
  combatDown: "Du gehst zu Boden … aber ein Freund hilft dir wieder auf. Du kommst trotzdem weiter.",
  combatStrikesBack: (enemy, dmg) => `Der ${enemy} schlägt zurück: −${dmg} HP!`,
  combatHit: (roll, bonus, total, target, enemy, dmg) =>
    `${roll} + ${bonus} = ${total} ≥ ${target} → Treffer! Der ${enemy} verliert ${dmg} HP.`,
  combatMiss: (roll, bonus, total, target) => `${roll} + ${bonus} = ${total} < ${target} → daneben!`,
  combatFireball: (enemy) => `🔥 Feuerball! Der ${enemy} verliert 5 HP.`,
  talkWin: (roll, cha, total, target) => `${roll} + ${cha} = ${total} ≥ ${target} → Du redest dich geschickt vorbei!`,
  talkFail: (roll, cha, total, enemy) => `${roll} + ${cha} = ${total} → der ${enemy} lacht nur. Jetzt hilft nur Kämpfen!`,
  attackPrompt: "Würfle für deinen Angriff:",
  talkPrompt: "Würfle, um dich vorbeizureden:",
  fireball: "🔥 Feuerball",
  talkAction: "💬 Reden",
  you: "Du",

  toBeContinued: "Fortsetzung folgt!",
  toJourney: "Zur Reise",
  levelUpTitle: (n) => `Stufe ${n}!`,
  mainPowerGrew: "Deine Hauptkraft ist gewachsen.",
  tapToClose: "(zum Schließen tippen)",
  found: "✦ Gefunden!",
};

const en: Strings = {
  tabReise: "Journey",
  tabHeld: "Hero",
  constellation: "Your Constellation",
  journeyContinues: "✦ …the journey continues",
  youAreHere: "YOU ARE HERE",
  episode: (n) => `Episode ${n}`,
  locked: "Soon",
  ctaBegin: "Begin the journey ✦",
  ctaContinue: "Continue ✦",
  ctaReplay: "Listen again ✦",
  ctaTravelOn: "Travel on ✦",
  ctaStart: "Let's go ✦",
  statusCompleted: "Completed ✓",
  statusReady: "Ready for the journey",
  sceneXofY: (n, total) => `Scene ${n} of ${total}`,

  held: "Hero",
  level: (n) => `LEVEL ${n}`,
  hp: (hp) => `❤️ ${hp} HP`,
  xpToNext: (nextLevel, xp) => `XP to level ${nextLevel} · ${xp}/3`,
  starPouch: "Star Pouch",
  noTreasures: "No treasures found yet.",
  newHero: "Create a new hero",
  resetTitle: "Create a new hero?",
  resetBody: "Your current hero and your progress will be lost.",
  cancel: "Cancel",
  delete: "Delete",
  close: "Close",
  language: "Language",

  createOverline: "Your adventure begins",
  createTitle: "Create your hero",
  mainPower: "Main power:",
  letsGo: "Let's go ✦",

  backJourney: "‹ Journey",
  theStory: "✦ The Story",

  readingAloud: "reading aloud…",
  a11yPause: "Pause",
  a11yResume: "Resume",
  a11yReplay: "Listen again",
  a11ySkip: "Skip",
  a11yNext: "Next",
  a11yListen: "Listen again",

  rollStars: "✦ Roll the stars",
  rollHigh: "Roll high – big numbers are good!",

  starQuestion: "✦ Star Question",
  correctFeedback: "Correct! +1 XP ✦",
  wrongFeedback: "Take a closer look next time.",
  tapAnswer: "Tap the correct answer",

  combatIntro: (enemy) => `A ${enemy} blocks the way!`,
  combatDefeated: (enemy) => `You defeated the ${enemy}! 🎉`,
  combatDown: "You fall … but a friend helps you back up. You carry on anyway.",
  combatStrikesBack: (enemy, dmg) => `The ${enemy} strikes back: −${dmg} HP!`,
  combatHit: (roll, bonus, total, target, enemy, dmg) =>
    `${roll} + ${bonus} = ${total} ≥ ${target} → Hit! The ${enemy} loses ${dmg} HP.`,
  combatMiss: (roll, bonus, total, target) => `${roll} + ${bonus} = ${total} < ${target} → miss!`,
  combatFireball: (enemy) => `🔥 Fireball! The ${enemy} loses 5 HP.`,
  talkWin: (roll, cha, total, target) => `${roll} + ${cha} = ${total} ≥ ${target} → You smoothly talk your way past!`,
  talkFail: (roll, cha, total, enemy) => `${roll} + ${cha} = ${total} → the ${enemy} just laughs. Now only fighting will do!`,
  attackPrompt: "Roll for your attack:",
  talkPrompt: "Roll to talk your way past:",
  fireball: "🔥 Fireball",
  talkAction: "💬 Talk",
  you: "You",

  toBeContinued: "To be continued!",
  toJourney: "To the journey",
  levelUpTitle: (n) => `Level ${n}!`,
  mainPowerGrew: "Your main power has grown.",
  tapToClose: "(tap to close)",
  found: "✦ Found!",
};

export const STRINGS: Record<Lang, Strings> = { de, en };

// The string table for the current language. Use inside components.
export function useT(): Strings {
  return STRINGS[useGame().lang];
}
// The current language — for resolving content `Localized` values via `loc()`.
export function useLang(): Lang {
  return useGame().lang;
}
