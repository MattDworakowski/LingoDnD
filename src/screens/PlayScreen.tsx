import { AudioPlayer, createAudioPlayer } from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import {
  anchorImage,
  characters,
  FIRST_EPISODE,
  getEpisode,
  sceneAudio,
  sceneText,
  Scene,
  Then,
} from "../content";
import { Character, useGame } from "../state";
import { colors, radius, slot, space } from "../theme";
import { Btn } from "../ui";

const rollD20 = () => Math.floor(Math.random() * 20) + 1;

type CombatThen = Extract<Then, { type: "combat" }>;
type MiniThen = Extract<Then, { type: "minigame" }>;
type SkillThen = Extract<Then, { type: "skillcheck" }>;

// LayoutAnimation needs an opt-in on Android for the HP-bar tweens.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PlayScreen({ onExit }: { onExit: () => void }) {
  const game = useGame();
  const character = game.character!;
  const ep = getEpisode(game.progress?.episodeId ?? FIRST_EPISODE);
  const resume = game.progress?.sceneId && ep.scenes[game.progress.sceneId] ? game.progress.sceneId : ep.startScene;

  const [sceneId, setSceneId] = useState<string>(resume);
  const [audioDone, setAudioDone] = useState(false);
  const [showText, setShowText] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [shownImage, setShownImage] = useState<number | undefined>(undefined);
  const playerRef = useRef<AudioPlayer | null>(null);

  const scene: Scene = ep.scenes[sceneId];
  const text = sceneText(scene, character.classId);
  const sceneAnchor = anchorImage(ep, scene.anchor);
  const revealNow = ep.revealImages === "onStart" || audioDone;

  useEffect(() => {
    setAudioDone(false);
    if (scene.grantItem) game.grantItem(scene.grantItem);
    game.setProgress({ episodeId: ep.id, sceneId });

    release();
    const src = sceneAudio(ep.id, scene, character.classId);
    if (!src) {
      setAudioDone(true);
      return;
    }
    let sub: { remove: () => void } | null = null;
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

    return () => {
      if (sub) sub.remove();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

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
      } catch {}
    }
  }
  // B1: keep the revealed image on screen across scenes; swap only when a new
  // anchor reveals (an anchor-less scene leaves the previous picture up).
  useEffect(() => {
    if (sceneAnchor && revealNow) setShownImage(sceneAnchor);
  }, [sceneAnchor, revealNow]);

  const go = (next: string) => setSceneId(next);

  function onMinigameDone(then: MiniThen, correct: boolean) {
    if (correct && game.addXp(then.xp)) setLevelUp(true);
    go(then.next);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.topIcon}>‹ Menü</Text>
        </Pressable>
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={12}>
          <Text style={styles.topIcon}>{showText ? "📖 ✕" : "📖"}</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {shownImage ? <Image source={shownImage} style={styles.anchorImg} resizeMode="contain" /> : null}
        {showText ? (
          <ScrollView style={styles.textPanel} contentContainerStyle={{ padding: space.md }}>
            <Text style={styles.narration}>{text}</Text>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.actionArea}>
        {!audioDone ? (
          <View style={styles.playingRow}>
            <ActivityIndicator color={colors.accent} />
            <Pressable onPress={replay} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>🔁 Nochmal</Text>
            </Pressable>
            <Pressable onPress={() => setAudioDone(true)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>überspringen ›</Text>
            </Pressable>
          </View>
        ) : (
          <Action scene={scene} character={character} onGo={go} onMinigameDone={onMinigameDone} onExit={onExit} replay={replay} />
        )}
      </View>

      {levelUp ? <LevelUpBanner level={character.level} onClose={() => setLevelUp(false)} /> : null}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ action */
function Action(props: {
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
        <View style={styles.center}>
          <Pressable onPress={props.replay} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>🔁 Nochmal hören</Text>
          </Pressable>
          <Btn title="Weiter" onPress={() => props.onGo(then.next)} style={{ marginTop: space.sm }} />
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
// Per-round dice ritual: roll → show the maths → animate HP → monster hits back
// on a miss → repeat until it's down. No Game Over (rescue at 0 HP). Specials:
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

  function doAttack(roll: number) {
    setPhase("resolving");
    const total = roll + bonus;
    if (total >= enemy.hitTarget) {
      const hp = Math.max(0, enemyHp - then.playerHitDamage);
      setMsg(`🎲 ${roll} + ${bonus} = ${total}  ≥ ${enemy.hitTarget}  →  Treffer! Der ${enemy.name} verliert ${then.playerHitDamage} HP.`);
      setTimeout(() => animateEnemyHp(hp), 450);
      setTimeout(() => settle(hp, playerHp), 1600);
    } else {
      const hp = Math.max(0, playerHp - enemy.damage);
      setMsg(`🎲 ${roll} + ${bonus} = ${total}  < ${enemy.hitTarget}  →  daneben! Der ${enemy.name} trifft dich: −${enemy.damage} HP.`);
      setTimeout(() => animatePlayerHp(hp), 450);
      setTimeout(() => settle(enemyHp, hp), 1600);
    }
  }

  function fireball() {
    if (phase !== "action" || magicUsed) return;
    setMagicUsed(true);
    setPhase("resolving");
    const hp = Math.max(0, enemyHp - 5);
    setMsg(`🔥 Feuerball! Der ${enemy.name} verliert 5 HP.`);
    setTimeout(() => animateEnemyHp(hp), 450);
    setTimeout(() => settle(hp, playerHp), 1600);
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
        <Btn title="Weiter" onPress={() => onResolve(then.winNext)} style={{ marginTop: space.sm }} />
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

function LevelUpBanner({ level, onClose }: { level: number; onClose: () => void }) {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: space.sm },
  topIcon: { color: colors.text, fontSize: 18, fontWeight: "700" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  anchorImg: { width: "90%", height: "100%" },
  textPanel: { position: "absolute", left: space.md, right: space.md, top: space.md, bottom: space.md, backgroundColor: "rgba(253,243,218,0.96)", borderRadius: radius.md },
  narration: { color: colors.ink, fontSize: 20, lineHeight: 30 },
  actionArea: { minHeight: 220, padding: space.md, justifyContent: "center" },
  center: { alignItems: "center", width: "100%" },
  playingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md },
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
});
