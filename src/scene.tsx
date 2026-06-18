// Shared scene engine: drives one episode's scene graph (audio playback, scene
// advancement, XP/level-up, progress save) and renders the scene interaction
// (Weiter / dice / mini-game / combat / ending). Used by both the linear
// PlayScreen and the overworld MapPlayScreen (B3) so they behave identically.
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { Image, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import {
  anchorImage,
  characters,
  Episode,
  FIRST_EPISODE,
  getEpisode,
  itemDef,
  itemImage,
  sceneAudio,
  sceneText,
  Scene,
  Then,
} from "./content";
import { Character, useGame } from "./state";
import { colors, radius, slot, space } from "./theme";
import { Btn, IconButton } from "./ui";

const rollD20 = () => Math.floor(Math.random() * 20) + 1;

type CombatThen = Extract<Then, { type: "combat" }>;
type MiniThen = Extract<Then, { type: "minigame" }>;
type SkillThen = Extract<Then, { type: "skillcheck" }>;

// LayoutAnimation needs an opt-in on Android for the HP-bar tweens.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ----------------------------------------------------------------- runner */
// Owns the playthrough state for the current episode. Both screens call this
// and present the result differently (full-screen stage vs map + modal).
// `active` gates audio: the map player keeps a scene inactive until the child
// reaches its node and opens it, so narration starts on entry — not mid-walk.
export function useEpisodeRunner({ active = true }: { active?: boolean } = {}) {
  const game = useGame();
  const character = game.character!;
  const ep = getEpisode(game.progress?.episodeId ?? FIRST_EPISODE);
  const resume = game.progress?.sceneId && ep.scenes[game.progress.sceneId] ? game.progress.sceneId : ep.startScene;

  const [sceneId, setSceneId] = useState<string>(resume);
  const [audioDone, setAudioDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [itemFound, setItemFound] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const scene: Scene = ep.scenes[sceneId];

  // Save progress + grant on-entry items as soon as a scene is entered, even if
  // it isn't active yet (e.g. while the hero is still walking toward its node).
  useEffect(() => {
    game.setProgress({ episodeId: ep.id, sceneId });
    if (scene.grantItem && !character.items.includes(scene.grantItem)) {
      game.grantItem(scene.grantItem);
      setItemFound(scene.grantItem); // → "Gefunden!" banner
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  // Audio: (re)starts when the scene becomes active; stopped while inactive.
  useEffect(() => {
    setAudioDone(false);
    setPaused(false);
    release();
    if (!active) return;
    const src = sceneAudio(ep.id, scene, character.classId);
    if (!src) {
      setAudioDone(true);
      return;
    }
    let sub: { remove: () => void } | null = null;
    // Defer the start one tick: when advancing to a scene at a NEW map node, the
    // map player closes the tray (active→false) on the very next render to walk
    // there. Deferring lets that cancel the start, so the narration doesn't blip
    // here and then replay on arrival.
    const startTimer = setTimeout(() => {
      try {
        const player = createAudioPlayer(src);
        playerRef.current = player;
        sub = player.addListener("playbackStatusUpdate", (status) => {
          if (status.didJustFinish) setAudioDone(true);
        });
        player.play();
      } catch {
        setAudioDone(true);
      }
    }, 80);

    return () => {
      clearTimeout(startTimer);
      if (sub) sub.remove();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, active]);

  function release() {
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.remove();
      } catch {}
    }
  }
  function replay() {
    const p = playerRef.current;
    if (p) {
      try {
        p.seekTo(0);
        p.play();
        setPaused(false);
      } catch {}
    }
  }
  function togglePause() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (paused) {
        p.play();
        setPaused(false);
      } else {
        p.pause();
        setPaused(true);
      }
    } catch {}
  }
  const go = (next: string) => setSceneId(next);
  function onMinigameDone(then: MiniThen, correct: boolean) {
    if (correct && game.addXp(then.xp)) setLevelUp(true);
    go(then.next);
  }

  return {
    ep,
    character,
    scene,
    sceneId,
    text: sceneText(scene, character.classId),
    anchor: anchorImage(ep, scene.anchor),
    revealNow: ep.revealImages === "onStart" || audioDone,
    audioDone,
    setAudioDone,
    replay,
    togglePause,
    paused,
    go,
    onMinigameDone,
    levelUp,
    setLevelUp,
    itemFound,
    setItemFound,
  };
}
export type EpisodeRunner = ReturnType<typeof useEpisodeRunner>;

/* ------------------------------------------------------- scene interaction */
// While audio plays: a replay/skip row. After: the scene's `then` action.
export function SceneInteraction({ runner, onExit }: { runner: EpisodeRunner; onExit: () => void }) {
  if (!runner.audioDone) {
    return (
      <View style={styles.playingRow}>
        <IconButton icon={runner.paused ? "▶️" : "⏸️"} onPress={runner.togglePause} accessibilityLabel={runner.paused ? "Weiter abspielen" : "Pause"} />
        <IconButton icon="🔁" onPress={runner.replay} accessibilityLabel="Nochmal anhören" />
        <IconButton icon="⏭️" onPress={() => runner.setAudioDone(true)} accessibilityLabel="Überspringen" />
      </View>
    );
  }
  return <SceneActions scene={runner.scene} character={runner.character} onGo={runner.go} onMinigameDone={runner.onMinigameDone} onExit={onExit} replay={runner.replay} />;
}

function SceneActions(props: {
  scene: Scene;
  character: Character;
  onGo: (id: string) => void;
  onMinigameDone: (then: MiniThen, correct: boolean) => void;
  onExit: () => void;
  replay: () => void;
}) {
  const then = props.scene.then;
  switch (then.type) {
    case "next":
      return (
        <View style={styles.iconRow}>
          <IconButton icon="🔁" onPress={props.replay} accessibilityLabel="Nochmal hören" />
          <IconButton icon="▶️" kind="gold" size={74} onPress={() => props.onGo(then.next)} accessibilityLabel="Weiter" />
        </View>
      );
    case "skillcheck":
      return (
        <DiceView
          then={then}
          onRoll={(n) => {
            const b = then.branches.find((br) => n >= br.min && n <= br.max);
            if (b) props.onGo(b.next);
          }}
        />
      );
    case "minigame":
      return <MiniGameView then={then} onDone={(c) => props.onMinigameDone(then, c)} />;
    case "combat":
      return <CombatView then={then} character={props.character} onResolve={props.onGo} />;
    case "ending":
      return <EndingView onExit={props.onExit} />;
  }
}

/* -------------------------------------------------------------------- dice */
// Shared d20: tap the number from your real die, or roll digitally. Mounted fresh
// for each roll (skill checks and every combat round), so its state self-resets.
function DiceRoller({ onRoll }: { onRoll: (n: number) => void }) {
  const [shown, setShown] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  function resolve(n: number) {
    if (shown !== null) return;
    setShown(n);
    setTimeout(() => onRoll(n), 750);
  }
  function digital() {
    if (rolling || shown !== null) return;
    setRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setShown(rollD20());
      if (++ticks > 9) {
        clearInterval(iv);
        const n = rollD20();
        setShown(n);
        setRolling(false);
        setTimeout(() => onRoll(n), 650);
      }
    }, 70);
  }

  return (
    <View style={styles.center}>
      {shown !== null ? <Text style={styles.bigRoll}>{shown}</Text> : null}
      <View style={styles.diceGrid}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <Pressable key={n} disabled={rolling || shown !== null} onPress={() => resolve(n)} style={styles.dieBtn}>
            <Text style={styles.dieText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={digital} disabled={rolling || shown !== null} style={styles.smallBtn}>
        <Text style={styles.smallBtnText}>🎲 Digital würfeln</Text>
      </Pressable>
    </View>
  );
}

function DiceView({ then, onRoll }: { then: SkillThen; onRoll: (n: number) => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.prompt}>🎲 {then.prompt}</Text>
      <Text style={styles.hint}>Würfle hoch – hohe Zahlen sind gut!</Text>
      <DiceRoller onRoll={onRoll} />
    </View>
  );
}

/* --------------------------------------------------------------- minigame */
function MiniGameView({ then, onDone }: { then: MiniThen; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setTimeout(() => onDone(i === then.correct), 1300);
  }
  return (
    <View style={styles.center}>
      <Text style={styles.prompt}>{then.question}</Text>
      <View style={{ width: "100%", gap: space.sm, marginTop: space.sm }}>
        {then.options.map((opt, i) => {
          const isAnswer = i === then.correct;
          const reveal = picked !== null;
          const bg = reveal && isAnswer ? colors.success : reveal && i === picked ? colors.fail : colors.bgPanel;
          return (
            <Pressable key={i} onPress={() => pick(i)} style={[styles.optBtn, { backgroundColor: bg }]}>
              <Text style={styles.optText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked !== null ? (
        <Text style={styles.feedback}>
          {picked === then.correct ? "Richtig! +1 EP ⭐" : "Schau beim nächsten Mal genau hin."}
        </Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------------- combat */
// Per-round dice ritual: roll → show the maths → animate enemy HP → the enemy
// strikes back if it's still standing (so you trade blows and actually take
// damage) → repeat until it's down. No Game Over (rescue at 0 HP). Specials:
// Magier Feuerball (instant), Barde Reden (its own roll to skip the fight).
function CombatView({ then, character, onResolve }: { then: CombatThen; character: Character; onResolve: (id: string) => void }) {
  const primary = characters.classes[character.classId].primary;
  const bonus = character.stats[primary];
  const enemy = then.enemy;
  const [enemyHp, setEnemyHp] = useState(enemy.hp);
  const [playerHp, setPlayerHp] = useState(character.maxHp);
  const [phase, setPhase] = useState<"action" | "talk" | "resolving" | "over">("action");
  const [msg, setMsg] = useState(`Ein ${enemy.name} versperrt den Weg!`);
  const [talkUsed, setTalkUsed] = useState(false);
  const [magicUsed, setMagicUsed] = useState(false);

  const canTalk = character.classId === "barde" && !!then.talkOut && !talkUsed && enemyHp === enemy.hp;
  const canMagic = character.classId === "magier" && !magicUsed;

  function animateEnemyHp(hp: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEnemyHp(hp);
  }
  function animatePlayerHp(hp: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPlayerHp(hp);
  }
  function settle(enemyNow: number, playerNow: number) {
    if (enemyNow <= 0) {
      setMsg(`Du hast den ${enemy.name} besiegt! 🎉`);
      setPhase("over");
    } else if (playerNow <= 0) {
      setMsg(`Du gehst zu Boden … aber ein Freund hilft dir wieder auf. Du kommst trotzdem weiter.`);
      setPhase("over");
    } else {
      setPhase("action");
    }
  }

  // Resolve a round: deal `dealt` to the enemy, then — if it survives — let it
  // strike back for enemy.damage, so the player actually trades blows.
  function resolveRound(dealt: number, openLine: string, animateDealt = true) {
    setPhase("resolving");
    const eHp = Math.max(0, enemyHp - dealt);
    const enemyDown = eHp <= 0;
    const pHp = enemyDown ? playerHp : Math.max(0, playerHp - enemy.damage);

    setMsg(openLine);
    if (animateDealt) setTimeout(() => animateEnemyHp(eHp), 400);
    else animateEnemyHp(eHp);

    if (enemyDown) {
      setTimeout(() => settle(eHp, pHp), 1500);
      return;
    }
    setTimeout(() => {
      setMsg(`Der ${enemy.name} schlägt zurück: −${enemy.damage} HP!`);
      animatePlayerHp(pHp);
    }, 1300);
    setTimeout(() => settle(eHp, pHp), 2400);
  }

  function doAttack(roll: number) {
    const total = roll + bonus;
    if (total >= enemy.hitTarget) {
      resolveRound(then.playerHitDamage, `🎲 ${roll} + ${bonus} = ${total}  ≥ ${enemy.hitTarget}  →  Treffer! Der ${enemy.name} verliert ${then.playerHitDamage} HP.`);
    } else {
      resolveRound(0, `🎲 ${roll} + ${bonus} = ${total}  < ${enemy.hitTarget}  →  daneben!`);
    }
  }

  function fireball() {
    if (phase !== "action" || magicUsed) return;
    setMagicUsed(true);
    resolveRound(5, `🔥 Feuerball! Der ${enemy.name} verliert 5 HP.`);
  }

  function doTalk(roll: number) {
    if (!then.talkOut) return;
    setPhase("resolving");
    const total = roll + character.stats.charisma;
    if (total >= then.talkOut.target) {
      setMsg(`🎲 ${roll} + ${character.stats.charisma} = ${total}  ≥ ${then.talkOut.target}  →  Du redest dich geschickt vorbei!`);
      setTimeout(() => onResolve(then.talkOut!.next), 1500);
    } else {
      setTalkUsed(true);
      setMsg(`🎲 ${roll} + ${character.stats.charisma} = ${total}  →  der ${enemy.name} lacht nur. Jetzt hilft nur Kämpfen!`);
      setTimeout(() => setPhase("action"), 1500);
    }
  }

  return (
    <View style={styles.center}>
      <HpBar label={enemy.name} hp={enemyHp} max={enemy.hp} color={colors.berry} />
      <HpBar label="Du" hp={playerHp} max={character.maxHp} color={colors.leaf} />
      <Text style={styles.combatMsg}>{msg}</Text>

      {phase === "over" ? (
        <IconButton icon="▶️" kind="gold" size={74} onPress={() => onResolve(then.winNext)} accessibilityLabel="Weiter" style={{ marginTop: space.sm }} />
      ) : null}

      {phase === "action" ? (
        <>
          {canMagic || canTalk ? (
            <View style={styles.specialRow}>
              {canMagic ? <Btn title="🔥 Feuerball" kind="ghost" onPress={fireball} /> : null}
              {canTalk ? <Btn title="💬 Reden" kind="ghost" onPress={() => setPhase("talk")} /> : null}
            </View>
          ) : null}
          <Text style={styles.hint}>Würfle für deinen Angriff:</Text>
          <DiceRoller onRoll={doAttack} />
        </>
      ) : null}

      {phase === "talk" ? (
        <>
          <Text style={styles.hint}>Würfle, um dich vorbeizureden:</Text>
          <DiceRoller onRoll={doTalk} />
        </>
      ) : null}
    </View>
  );
}

function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  return (
    <View style={{ width: "100%", marginBottom: space.sm }}>
      <Text style={styles.hpText}>
        {label}: {hp}/{max}
      </Text>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${(hp / max) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------- ending */
function EndingView({ onExit }: { onExit: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.star}>⭐</Text>
      <Text style={styles.endTitle}>Fortsetzung folgt!</Text>
      <Btn title="Zur Übersicht" onPress={onExit} style={{ marginTop: space.md }} />
    </View>
  );
}

export function LevelUpBanner({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.levelCard}>
        <Text style={styles.star}>✨</Text>
        <Text style={styles.endTitle}>Stufe {level}!</Text>
        <Text style={styles.levelText}>Deine Hauptkraft ist gewachsen.</Text>
        <Text style={styles.levelTap}>(zum Schließen tippen)</Text>
      </View>
    </Pressable>
  );
}

// Celebratory popup when an item is picked up (see grantItem in the runner).
export function ItemFoundBanner({ ep, itemId, onClose }: { ep: Episode; itemId: string; onClose: () => void }) {
  const def = itemDef(ep, itemId);
  const img = itemImage(ep, itemId);
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.levelCard}>
        <Text style={styles.foundLabel}>✨ Gefunden!</Text>
        <View style={styles.foundImgBox}>{img ? <Image source={img} style={styles.foundImg} resizeMode="contain" /> : null}</View>
        <Text style={styles.endTitle}>{def?.name ?? itemId}</Text>
        <Text style={styles.levelTap}>(zum Schließen tippen)</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", width: "100%" },
  playingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md },
  iconRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.lg },
  smallBtn: { ...slot, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18 },
  smallBtnText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  prompt: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  hint: { color: colors.textDim, fontSize: 14, marginTop: 4, marginBottom: space.sm },
  bigRoll: { color: colors.accent, fontSize: 56, fontWeight: "900" },
  diceGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginVertical: space.sm, maxWidth: 360 },
  dieBtn: { ...slot, width: 58, height: 48, alignItems: "center", justifyContent: "center" },
  dieText: { color: colors.text, fontSize: 20, fontWeight: "800" },
  optBtn: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: radius.md, width: "100%", borderWidth: 2, borderColor: colors.panelDark, borderBottomWidth: 4 },
  optText: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  feedback: { color: colors.text, fontSize: 18, marginTop: space.md, textAlign: "center" },
  combatMsg: { color: colors.text, fontSize: 18, textAlign: "center", marginVertical: space.sm, minHeight: 56 },
  specialRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginBottom: space.sm },
  hpText: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  hpTrack: { height: 16, backgroundColor: "#1f1736", borderRadius: radius.pill, overflow: "hidden" },
  hpFill: { height: "100%", borderRadius: radius.pill },
  star: { fontSize: 64 },
  endTitle: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: space.sm },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  levelCard: { backgroundColor: colors.bgPanel, borderRadius: radius.lg, padding: space.xl, alignItems: "center", borderWidth: 3, borderColor: colors.accent },
  levelText: { color: colors.text, fontSize: 18, marginTop: space.sm, textAlign: "center" },
  levelTap: { color: colors.textDim, fontSize: 13, marginTop: space.md },
  foundLabel: { color: colors.gold, fontSize: 18, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  foundImgBox: { ...slot, backgroundColor: colors.bgDeep, width: 130, height: 130, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm, marginTop: space.md },
  foundImg: { width: "100%", height: "100%" },
});
