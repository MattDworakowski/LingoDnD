// Shared scene engine: drives one episode's scene graph (audio playback, scene
// advancement, XP/level-up, progress save) and renders the scene interaction
// (Weiter / dice / mini-game / combat / ending). Used by both the linear
// PlayScreen and the overworld MapPlayScreen (B3) so they behave identically.
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { Image, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { BlurView } from "expo-blur";
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
import { Equalizer, GemD20, Glow, IconPause, IconPlay, IconReplay, IconSkip, Overline, StarPip } from "./nightshade";
import { colors, font, glassShadow, radius, space } from "./theme";
import { Btn, IconButton } from "./ui";

const rollD20 = () => Math.floor(Math.random() * 20) + 1;

type CombatThen = Extract<Then, { type: "combat" }>;
type MiniThen = Extract<Then, { type: "minigame" }>;
type SkillThen = Extract<Then, { type: "skillcheck" }>;
const DOT_COLORS = [colors.dotTeal, colors.dotPink, colors.dotBlue, colors.gold];

// LayoutAnimation needs an opt-in on Android for the HP tweens.
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
// While audio plays: a frosted audio dock (equalizer + pause/replay/skip). After: the scene's `then` action.
export function SceneInteraction({ runner, onExit }: { runner: EpisodeRunner; onExit: () => void }) {
  if (!runner.audioDone) {
    return (
      <View style={styles.audioDock}>
        <View style={styles.dockNow}>
          <Equalizer />
          <Text style={styles.dockLabel}>wird vorgelesen…</Text>
        </View>
        <View style={styles.playingRow}>
          <IconButton kind="wood" size={56} onPress={runner.togglePause} accessibilityLabel={runner.paused ? "Weiter abspielen" : "Pause"}>
            {runner.paused ? <IconPlay size={24} color={colors.text} /> : <IconPause size={24} color={colors.text} />}
          </IconButton>
          <IconButton kind="wood" size={56} onPress={runner.replay} accessibilityLabel="Nochmal anhören">
            <IconReplay size={24} color={colors.text} />
          </IconButton>
          <IconButton kind="gold" size={56} onPress={() => runner.setAudioDone(true)} accessibilityLabel="Überspringen">
            <IconSkip size={24} color={colors.inkOnGold} />
          </IconButton>
        </View>
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
          <IconButton kind="wood" onPress={props.replay} accessibilityLabel="Nochmal hören">
            <IconReplay size={26} color={colors.text} />
          </IconButton>
          <IconButton kind="gold" size={74} onPress={() => props.onGo(then.next)} accessibilityLabel="Weiter">
            <IconPlay size={34} />
          </IconButton>
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
      <GemD20 size={92} value={shown} />
      <View style={styles.diceGrid}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <Pressable key={n} disabled={rolling || shown !== null} onPress={() => resolve(n)} style={styles.dieBtn}>
            <Text style={styles.dieText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Btn title="✦ Sterne würfeln" kind="primary" onPress={digital} disabled={rolling || shown !== null} style={{ marginTop: space.sm }} />
    </View>
  );
}

function DiceView({ then, onRoll }: { then: SkillThen; onRoll: (n: number) => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.prompt}>{then.prompt}</Text>
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
      <Overline style={{ marginBottom: 4 }}>✦ Sternenfrage</Overline>
      <Text style={styles.prompt}>{then.question}</Text>
      <View style={{ width: "100%", gap: space.sm, marginTop: space.md }}>
        {then.options.map((opt, i) => {
          const isAnswer = i === then.correct;
          const reveal = picked !== null;
          const correct = reveal && isAnswer;
          const wrong = reveal && i === picked && !isAnswer;
          return (
            <Pressable
              key={i}
              onPress={() => pick(i)}
              style={[styles.optBtn, correct && styles.optCorrect, wrong && styles.optWrong]}
            >
              <View style={[styles.optDot, { backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }]} />
              <Text style={styles.optText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked !== null ? (
        <Text style={styles.feedback}>{picked === then.correct ? "Richtig! +1 EP ✦" : "Schau beim nächsten Mal genau hin."}</Text>
      ) : (
        <Text style={styles.hint}>Tippe die richtige Antwort an</Text>
      )}
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
      resolveRound(then.playerHitDamage, `${roll} + ${bonus} = ${total} ≥ ${enemy.hitTarget} → Treffer! Der ${enemy.name} verliert ${then.playerHitDamage} HP.`);
    } else {
      resolveRound(0, `${roll} + ${bonus} = ${total} < ${enemy.hitTarget} → daneben!`);
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
      setMsg(`${roll} + ${character.stats.charisma} = ${total} ≥ ${then.talkOut.target} → Du redest dich geschickt vorbei!`);
      setTimeout(() => onResolve(then.talkOut!.next), 1500);
    } else {
      setTalkUsed(true);
      setMsg(`${roll} + ${character.stats.charisma} = ${total} → der ${enemy.name} lacht nur. Jetzt hilft nur Kämpfen!`);
      setTimeout(() => setPhase("action"), 1500);
    }
  }

  return (
    <View style={styles.center}>
      <HpPips label={enemy.name} hp={enemyHp} max={enemy.hp} color={colors.pink} />
      <HpPips label="Du" hp={playerHp} max={character.maxHp} color={colors.teal} />
      <Text style={styles.combatMsg}>{msg}</Text>

      {phase === "over" ? (
        <IconButton kind="gold" size={74} onPress={() => onResolve(then.winNext)} accessibilityLabel="Weiter" style={{ marginTop: space.sm }}>
          <IconPlay size={34} />
        </IconButton>
      ) : null}

      {phase === "action" ? (
        <>
          {canMagic || canTalk ? (
            <View style={styles.specialRow}>
              {canMagic ? <Btn title="🔥 Feuerball" kind="danger" onPress={fireball} /> : null}
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

// HP shown as a row of star pips: filled = remaining, faint outline = lost.
function HpPips({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  return (
    <View style={styles.hpRow}>
      <Text style={styles.hpLabel}>{label}</Text>
      <View style={styles.pips}>
        {Array.from({ length: max }, (_, i) => (
          <StarPip key={i} size={16} color={color} filled={i < hp} />
        ))}
      </View>
      <Text style={[styles.hpCount, { color }]}>
        {hp}/{max}
      </Text>
    </View>
  );
}

/* ----------------------------------------------------------------- ending */
function EndingView({ onExit }: { onExit: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.star}>⭐</Text>
      <Text style={styles.endTitle}>Fortsetzung folgt!</Text>
      <Btn title="Zur Reise" kind="gold" onPress={onExit} style={{ marginTop: space.md }} />
    </View>
  );
}

function BannerCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bannerCard}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassFillStrong }]} />
      {children}
    </View>
  );
}

export function LevelUpBanner({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Glow size={320} color={colors.gold} opacity={0.5} style={{ position: "absolute" }} />
      <BannerCard>
        <Text style={styles.star}>✨</Text>
        <Text style={styles.endTitle}>Stufe {level}!</Text>
        <Text style={styles.levelText}>Deine Hauptkraft ist gewachsen.</Text>
        <Text style={styles.levelTap}>(zum Schließen tippen)</Text>
      </BannerCard>
    </Pressable>
  );
}

// Celebratory popup when an item is picked up (see grantItem in the runner).
export function ItemFoundBanner({ ep, itemId, onClose }: { ep: Episode; itemId: string; onClose: () => void }) {
  const def = itemDef(ep, itemId);
  const img = itemImage(ep, itemId);
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Glow size={320} color={colors.gold} opacity={0.5} style={{ position: "absolute" }} />
      <BannerCard>
        <Text style={styles.foundLabel}>✦ Gefunden!</Text>
        <View style={styles.foundImgBox}>
          <Glow size={150} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
          {img ? <Image source={img} style={styles.foundImg} resizeMode="contain" /> : null}
        </View>
        <Text style={styles.endTitle}>{def?.name ?? itemId}</Text>
        <Text style={styles.levelTap}>(zum Schließen tippen)</Text>
      </BannerCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", width: "100%" },

  // audio dock
  audioDock: { width: "100%", alignItems: "center", gap: space.md },
  dockNow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dockLabel: { color: colors.textDim, fontSize: 14, fontFamily: font.body, fontStyle: "italic" },
  playingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md },
  iconRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.lg },

  prompt: { color: colors.textBright, fontSize: 22, fontFamily: font.displayBold, textAlign: "center" },
  hint: { color: colors.textDim, fontSize: 14, fontFamily: font.body, marginTop: 4, marginBottom: space.sm },

  // dice
  diceGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginVertical: space.sm, maxWidth: 300 },
  dieBtn: { width: 62, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder },
  dieText: { color: colors.text, fontSize: 20, fontFamily: font.displayBold },

  // minigame
  optBtn: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 16, paddingHorizontal: 18, borderRadius: radius.md, width: "100%", backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder },
  optCorrect: { backgroundColor: "rgba(111,227,196,0.22)", borderColor: colors.teal },
  optWrong: { backgroundColor: "rgba(255,138,166,0.22)", borderColor: colors.pink },
  optDot: { width: 22, height: 22, borderRadius: 11 },
  optText: { color: colors.text, fontSize: 18, fontFamily: font.bodyBold, flex: 1 },
  feedback: { color: colors.text, fontSize: 18, fontFamily: font.bodyBold, marginTop: space.md, textAlign: "center" },

  // combat
  combatMsg: { color: colors.text, fontSize: 16, fontFamily: font.body, textAlign: "center", marginVertical: space.sm, minHeight: 54, lineHeight: 23 },
  specialRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginBottom: space.sm },
  hpRow: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: space.sm, gap: space.sm },
  hpLabel: { color: colors.text, fontSize: 14, fontFamily: font.bodyBold, width: 64 },
  pips: { flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 2 },
  hpCount: { fontSize: 13, fontFamily: font.bodyBold, width: 40, textAlign: "right" },

  // banners
  star: { fontSize: 64 },
  endTitle: { color: colors.textBright, fontSize: 28, fontFamily: font.displayBold, marginTop: space.sm },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(8,10,32,0.7)", alignItems: "center", justifyContent: "center" },
  bannerCard: { borderRadius: radius.lg, padding: space.xl, alignItems: "center", borderWidth: 2, borderColor: colors.gold, overflow: "hidden", ...glassShadow },
  levelText: { color: colors.text, fontSize: 18, fontFamily: font.body, marginTop: space.sm, textAlign: "center" },
  levelTap: { color: colors.textDim, fontSize: 13, fontFamily: font.body, marginTop: space.md },
  foundLabel: { color: colors.gold, fontSize: 18, fontFamily: font.bodyHeavy, letterSpacing: 1, textTransform: "uppercase" },
  foundImgBox: { width: 130, height: 130, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm, marginTop: space.md },
  foundImg: { width: "100%", height: "100%" },
});
