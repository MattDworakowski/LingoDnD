// Overworld map player (B3) with the "Nightshade" treatment: the real forest map
// gets a moonlit indigo wash (so it reads as gentle twilight, not pitch black),
// the hero walks the SPINE node→node along a glowing gold trail with a warm glow
// spotlighting the current node, and each scene resolves in a frosted-glass tray.
import React, { useEffect, useId, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import { avatarImage, loc, mapImage, MapNode, spineNodes } from "../content";
import { useEpisodeRunner, SceneInteraction, LevelUpBanner, ItemFoundBanner } from "../scene";
import { useLang, useT } from "../i18n";
import { Glow, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";
import { Btn } from "../ui";

const HERO = 80; // character cutout (transparent full-body sprite), not a circle crop
const NODE = 38;
const MAP_ASPECT = 1024 / 1536; // placeholder map w/h; per-episode when real maps land
const BASE = 1.7; // map layout size vs viewport (room to pan at the most zoomed-out level)
const Z_REST = 1.0; // zoom when resting at a node
const Z_TRAVEL = 0.78; // pulled-back zoom while walking, to show the journey

export default function MapPlayScreen({ onExit }: { onExit: () => void }) {
  const t = useT();
  const lang = useLang();
  const { width, height } = useWindowDimensions();
  const [modalOpen, setModalOpen] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const runner = useEpisodeRunner({ active: modalOpen });
  const ep = runner.ep;
  const character = runner.character;
  const nodes = spineNodes(ep);
  const map = mapImage(ep);
  const avatar = avatarImage(character.classId, character.gender);

  // Map layout size: bigger than the viewport so a node can be centered with
  // room to pan, even at the most zoomed-out (Z_TRAVEL) level.
  const mapW = Math.max(width, height * MAP_ASPECT) * BASE;
  const mapH = mapW / MAP_ASPECT;

  const nodeCenter = (n: MapNode) => ({ x: n.pos.x * mapW, y: n.pos.y * mapH });
  // Anchor the cutout's feet near the node (it stands on the node, not centered on it).
  const heroTopLeft = (n: MapNode) => ({ x: n.pos.x * mapW - HERO / 2, y: n.pos.y * mapH - HERO * 0.82 });

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const camForPoint = (px: number, py: number, z: number) => ({
    x: clamp(width / 2 - mapW / 2 - z * (px - mapW / 2), width - (mapW / 2) * (1 + z), (mapW / 2) * (z - 1)),
    y: clamp(height / 2 - mapH / 2 - z * (py - mapH / 2), height - (mapH / 2) * (1 + z), (mapH / 2) * (z - 1)),
  });
  const camForNode = (n: MapNode, z: number) => {
    const c = nodeCenter(n);
    return camForPoint(c.x, c.y, z);
  };

  function resumeNode(): MapNode {
    const order = Object.keys(ep.scenes);
    const here = order.indexOf(runner.sceneId);
    let node = nodes[0];
    for (const n of nodes) {
      if (order.indexOf(n.id) <= here) node = n;
      else break;
    }
    return node;
  }
  const [heroNode, setHeroNode] = useState<MapNode>(resumeNode);
  const heroIndex = heroNode.index;

  const cam = useRef<Animated.ValueXY | null>(null);
  if (!cam.current) cam.current = new Animated.ValueXY(camForNode(heroNode, Z_REST));
  const heroXY = useRef<Animated.ValueXY | null>(null);
  if (!heroXY.current) heroXY.current = new Animated.ValueXY(heroTopLeft(heroNode));
  const zoom = useRef(new Animated.Value(Z_REST)).current;
  const heroScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const target = nodes.find((n) => n.id === runner.sceneId);
    if (!target || target.id === heroNode.id) return;
    const from = nodeCenter(heroNode);
    const to = nodeCenter(target);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    setModalOpen(false);
    setTraveling(true);
    Animated.parallel([
      Animated.timing(heroXY.current!, { toValue: heroTopLeft(target), duration: 1150, useNativeDriver: true }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(zoom, { toValue: Z_TRAVEL, duration: 430, useNativeDriver: true }),
          Animated.timing(cam.current!, { toValue: camForPoint(mid.x, mid.y, Z_TRAVEL), duration: 430, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(zoom, { toValue: Z_REST, duration: 620, useNativeDriver: true }),
          Animated.timing(cam.current!, { toValue: camForNode(target, Z_REST), duration: 620, useNativeDriver: true }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (!finished) return;
      setHeroNode(target);
      setTraveling(false);
      Animated.sequence([
        Animated.timing(heroScale, { toValue: 1.16, duration: 140, useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner.sceneId]);

  const atStart = heroNode.index === 0 && runner.sceneId === ep.startScene;
  const heroC = nodeCenter(heroNode);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.mapLayer,
          { width: mapW, height: mapH, transform: [...cam.current.getTranslateTransform(), { scale: zoom }] },
        ]}
      >
        {map ? <Image source={map} style={{ width: mapW, height: mapH }} resizeMode="cover" /> : null}

        {/* moonlit "nightshade" wash: darken + cool moonlight + warm glow on hero */}
        <MapWash w={mapW} h={mapH} hx={heroC.x} hy={heroC.y} />

        {/* gold trail + star nodes */}
        <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill} pointerEvents="none">
          {nodes.slice(0, -1).map((n, i) => {
            const a = nodeCenter(n);
            const b = nodeCenter(nodes[i + 1]);
            const done = i + 1 <= heroIndex;
            return (
              <Line
                key={`s${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colors.gold}
                strokeWidth={done ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={done ? undefined : "2 9"}
                opacity={done ? 0.9 : 0.4}
              />
            );
          })}
          {/* open-ended: trail continues off the top past the last node */}
          {nodes.length > 0
            ? (() => {
                const last = nodeCenter(nodes[nodes.length - 1]);
                return <Line x1={last.x} y1={last.y} x2={last.x} y2={last.y - 140} stroke={colors.gold} strokeWidth={2} strokeDasharray="2 9" strokeLinecap="round" opacity={0.22} />;
              })()
            : null}
          {nodes.map((n) => {
            const c = nodeCenter(n);
            const done = n.index < heroIndex;
            const current = n.index === heroIndex;
            if (current) return <Circle key={n.id} cx={c.x} cy={c.y} r={7} fill={colors.gold} opacity={0.95} />;
            return <Circle key={n.id} cx={c.x} cy={c.y} r={done ? 6 : 4} fill={done ? colors.gold : "#fff"} opacity={done ? 0.9 : 0.4} />;
          })}
        </Svg>

        {/* pulsing ring on the current node */}
        <Animated.View
          pointerEvents="none"
          style={[styles.curRing, { left: heroC.x - 19, top: heroC.y - 19, transform: [{ scale: pulse }] }]}
        />

        {/* tap target on the current node */}
        {nodes.map((n) => {
          const c = nodeCenter(n);
          const isCurrent = n.index === heroIndex;
          return (
            <Pressable
              key={`hit-${n.id}`}
              disabled={!isCurrent || modalOpen || traveling}
              onPress={() => setModalOpen(true)}
              style={[styles.nodeHit, { left: c.x - NODE / 2, top: c.y - NODE / 2 }]}
            />
          );
        })}

        <Animated.View style={[styles.hero, { transform: [...heroXY.current.getTranslateTransform(), { scale: heroScale }] }]}>
          <Glow size={HERO * 1.7} color={colors.gold} opacity={0.4} style={{ position: "absolute", left: -HERO * 0.35, top: -HERO * 0.2 }} />
          {avatar ? <Image source={avatar} style={styles.heroImg} resizeMode="contain" /> : null}
        </Animated.View>
      </Animated.View>

      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.back}>{t.backJourney}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {loc(ep.title, lang)}
        </Text>
        <View style={{ width: 60 }} />
      </SafeAreaView>

      {!modalOpen && !traveling ? (
        <View style={styles.cta} pointerEvents="box-none">
          <Btn title={atStart ? t.ctaStart : t.ctaTravelOn} kind="gold" onPress={() => setModalOpen(true)} />
        </View>
      ) : null}

      {modalOpen ? <SceneModal runner={runner} onExit={onExit} /> : null}

      {runner.itemFound ? <ItemFoundBanner ep={ep} itemId={runner.itemFound} onClose={() => runner.setItemFound(null)} /> : null}
      {runner.levelUp ? <LevelUpBanner level={character.level} onClose={() => runner.setLevelUp(false)} /> : null}
    </View>
  );
}

// The moonlit wash, layered over the map image (RN has no mix-blend-mode, so we
// approximate: a dark-indigo darken + cool moonlight from the top + a warm gold
// spotlight around the hero node + a soft vignette).
function MapWash({ w, h, hx, hy }: { w: number; h: number; hx: number; hy: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={`moon-${uid}`} cx="72%" cy="3%" r="60%">
          <Stop offset="0%" stopColor="#aab8ff" stopOpacity={0.28} />
          <Stop offset="55%" stopColor="#aab8ff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`hero-${uid}`} cx={`${(hx / w) * 100}%`} cy={`${(hy / h) * 100}%`} r="20%">
          <Stop offset="0%" stopColor="#ffd479" stopOpacity={0.34} />
          <Stop offset="100%" stopColor="#ffd479" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`vig-${uid}`} cx="50%" cy="42%" r="75%">
          <Stop offset="58%" stopColor="#0a0c28" stopOpacity={0} />
          <Stop offset="100%" stopColor="#0a0c28" stopOpacity={0.55} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="#1e2252" fillOpacity={0.4} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#moon-${uid})`} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#hero-${uid})`} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#vig-${uid})`} />
    </Svg>
  );
}

/* ---------------------------------------------------- scene tray over the map */
function SceneModal({ runner, onExit }: { runner: ReturnType<typeof useEpisodeRunner>; onExit: () => void }) {
  const t = useT();
  const [showText, setShowText] = useState(false);
  const { text, anchor, revealNow } = runner;
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [90, 0] });

  return (
    <View style={styles.modalWrap} pointerEvents="box-none">
      <Animated.View style={[styles.tray, { opacity: slide, transform: [{ translateY }] }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(22,26,60,0.55)" }]} />
        <View style={styles.trayHandle} />
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={12} style={styles.trayBook}>
          <Text style={styles.bookIcon}>{showText ? "✕" : "📖"}</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {revealNow && anchor ? (
            <View style={styles.anchorWrap}>
              <Glow size={190} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
              <Image source={anchor} style={styles.anchorImg} resizeMode="contain" />
            </View>
          ) : null}
          {showText ? (
            <View style={styles.textPanel}>
              <Overline style={{ marginBottom: 6 }}>{t.theStory}</Overline>
              <Text style={styles.narration}>{text}</Text>
            </View>
          ) : null}
          <SceneInteraction runner={runner} onExit={onExit} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep, overflow: "hidden" },
  mapLayer: { position: "absolute", top: 0, left: 0 },

  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md },
  back: { color: colors.text, fontSize: 17, fontFamily: font.bodyBold, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },
  title: { flex: 1, textAlign: "center", color: colors.text, fontSize: 16, fontFamily: font.displayBold, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },

  nodeHit: { position: "absolute", width: NODE, height: NODE },
  curRing: { position: "absolute", width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.gold, opacity: 0.55 },

  hero: { position: "absolute", top: 0, left: 0, width: HERO, height: HERO, alignItems: "center", justifyContent: "center" },
  heroImg: { width: "100%", height: "100%", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },

  cta: { position: "absolute", left: 0, right: 0, bottom: space.xl, alignItems: "center" },

  modalWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" },
  tray: {
    width: "100%",
    maxHeight: "64%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
    paddingBottom: space.lg,
  },
  trayHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.glassBorderStrong, marginBottom: space.xs },
  trayBook: { position: "absolute", right: space.md, top: space.sm, zIndex: 2 },
  bookIcon: { fontSize: 18, color: colors.textDim },
  modalBody: { padding: space.sm, alignItems: "center" },
  anchorWrap: { width: "70%", height: 150, marginBottom: space.sm, alignItems: "center", justifyContent: "center" },
  anchorImg: { width: "100%", height: "100%" },
  textPanel: { backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, padding: space.md, marginBottom: space.md, width: "100%" },
  narration: { color: colors.text, fontSize: 18, lineHeight: 27, fontFamily: font.body },
});
