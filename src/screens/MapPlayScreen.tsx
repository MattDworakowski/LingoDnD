// Overworld map player (B3). The episode plays out on a panning, zooming map:
// the hero walks the SPINE node→node, the camera pulls back to frame the trip
// then zooms in on arrival, a dotted path connects the nodes, and each scene
// resolves in a tray. Branches/dice/combat live in the tray, so the hero only
// walks the spine.
import React, { useEffect, useRef, useState } from "react";
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
import { avatarImage, mapImage, MapNode, spineNodes } from "../content";
import { useEpisodeRunner, SceneInteraction, LevelUpBanner, ItemFoundBanner } from "../scene";
import { colors, radius, space } from "../theme";
import { Btn } from "../ui";

const HERO = 80; // character cutout (transparent full-body sprite), not a circle crop
const NODE = 38;
const DOT = 9;
const MAP_ASPECT = 1024 / 1536; // placeholder map w/h; per-episode when real maps land
const BASE = 1.7; // map layout size vs viewport (room to pan at the most zoomed-out level)
const Z_REST = 1.0; // zoom when resting at a node
const Z_TRAVEL = 0.78; // pulled-back zoom while walking, to show the journey

export default function MapPlayScreen({ onExit }: { onExit: () => void }) {
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

  // Camera translate to centre a map point at zoom z (scale is about the layer
  // centre), clamped so the scaled map always covers the viewport.
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const camForPoint = (px: number, py: number, z: number) => ({
    x: clamp(width / 2 - mapW / 2 - z * (px - mapW / 2), width - (mapW / 2) * (1 + z), (mapW / 2) * (z - 1)),
    y: clamp(height / 2 - mapH / 2 - z * (py - mapH / 2), height - (mapH / 2) * (1 + z), (mapH / 2) * (z - 1)),
  });
  const camForNode = (n: MapNode, z: number) => {
    const c = nodeCenter(n);
    return camForPoint(c.x, c.y, z);
  };

  // Where the hero stands now. On resume into a sub-scene (no node of its own),
  // stand at the most recent spine node at/before it in scene order.
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

  // When the story advances to a NEW spine node, close the tray and travel there:
  // pull back to frame both nodes, walk the hero across, then zoom in on arrival
  // with a little landing bounce. Sub-scenes keep the hero put.
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

  // Dotted trail along the whole spine; walked segments gold, upcoming cream.
  const dots: { key: string; x: number; y: number; done: boolean }[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodeCenter(nodes[i]);
    const b = nodeCenter(nodes[i + 1]);
    const k = Math.max(2, Math.min(9, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 44)));
    const done = i + 1 <= heroIndex;
    for (let j = 1; j < k; j++) {
      const t = j / k;
      dots.push({ key: `${i}-${j}`, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, done });
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.mapLayer,
          { width: mapW, height: mapH, transform: [...cam.current.getTranslateTransform(), { scale: zoom }] },
        ]}
      >
        {map ? <Image source={map} style={{ width: mapW, height: mapH }} resizeMode="cover" /> : null}

        {dots.map((d) => (
          <View key={d.key} style={[styles.dot, d.done ? styles.dotDone : styles.dotNext, { left: d.x - DOT / 2, top: d.y - DOT / 2 }]} />
        ))}

        {nodes.map((n) => {
          const c = nodeCenter(n);
          const isCurrent = n.index === heroIndex;
          const done = n.index < heroIndex;
          return (
            <Pressable
              key={n.id}
              disabled={!isCurrent || modalOpen || traveling}
              onPress={() => setModalOpen(true)}
              style={[styles.nodeHit, { left: c.x - NODE / 2, top: c.y - NODE / 2 }]}
            >
              <Animated.View
                style={[styles.node, done && styles.nodeDone, isCurrent && styles.nodeCurrent, isCurrent && { transform: [{ scale: pulse }] }]}
              >
                <Text style={styles.nodeLabel}>{done ? "✓" : n.index + 1}</Text>
              </Animated.View>
            </Pressable>
          );
        })}

        <Animated.View style={[styles.hero, { transform: [...heroXY.current.getTranslateTransform(), { scale: heroScale }] }]}>
          {avatar ? <Image source={avatar} style={styles.heroImg} resizeMode="contain" /> : null}
        </Animated.View>
      </Animated.View>

      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.topIcon}>‹ Menü</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {ep.title}
        </Text>
        <View style={{ width: 60 }} />
      </SafeAreaView>

      {!modalOpen && !traveling ? (
        <View style={styles.cta} pointerEvents="box-none">
          <Btn title={atStart ? "▶ Los geht's!" : "▶ Weiter"} kind="gold" onPress={() => setModalOpen(true)} />
        </View>
      ) : null}

      {modalOpen ? <SceneModal runner={runner} onExit={onExit} /> : null}

      {runner.itemFound ? <ItemFoundBanner ep={ep} itemId={runner.itemFound} onClose={() => runner.setItemFound(null)} /> : null}
      {runner.levelUp ? <LevelUpBanner level={character.level} onClose={() => runner.setLevelUp(false)} /> : null}
    </View>
  );
}

/* ---------------------------------------------------- scene tray over the map */
// A bottom sheet that slides up on open and auto-sizes to its content, so plain
// narration leaves the map visible above and only dice/combat grow it (capped).
function SceneModal({ runner, onExit }: { runner: ReturnType<typeof useEpisodeRunner>; onExit: () => void }) {
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
        <View style={styles.trayHandle} />
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={12} style={styles.trayBook}>
          <Text style={styles.topIcon}>{showText ? "📖 ✕" : "📖"}</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {revealNow && anchor ? <Image source={anchor} style={styles.anchorImg} resizeMode="contain" /> : null}
          {showText ? (
            <View style={styles.textPanel}>
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
  topIcon: { color: colors.text, fontSize: 18, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },
  title: { flex: 1, textAlign: "center", color: colors.text, fontSize: 16, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },

  dot: { position: "absolute", width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1 },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
  dotNext: { backgroundColor: colors.parchment, borderColor: colors.panelDark, opacity: 0.8 },

  nodeHit: { position: "absolute", width: NODE, height: NODE, alignItems: "center", justifyContent: "center" },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.panelEdge, borderBottomWidth: 4, borderBottomColor: colors.panelDark, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: colors.greenDeep, borderColor: colors.green },
  nodeCurrent: { borderColor: colors.gold, borderBottomColor: colors.goldDeep, backgroundColor: colors.goldDeep },
  nodeLabel: { color: colors.text, fontSize: 16, fontWeight: "900" },

  // Transparent character cutout, with a soft drop shadow so it sits on the map.
  hero: { position: "absolute", top: 0, left: 0, width: HERO, height: HERO, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  heroImg: { width: "100%", height: "100%" },

  cta: { position: "absolute", left: 0, right: 0, bottom: space.xl, alignItems: "center" },

  // Bottom sheet: anchored to the bottom, no full-screen dim, so the map stays
  // visible above. Auto-sizes to content; caps + scrolls when tall (combat).
  modalWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" },
  tray: {
    width: "100%",
    maxHeight: "62%",
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.panelEdge,
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
    paddingBottom: space.lg,
  },
  trayHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.panelEdge, marginBottom: space.xs },
  trayBook: { position: "absolute", right: space.md, top: space.sm, zIndex: 2 },
  modalBody: { padding: space.sm, alignItems: "center" },
  anchorImg: { width: "70%", height: 150, marginBottom: space.sm },
  textPanel: { backgroundColor: colors.parchment, borderRadius: radius.md, padding: space.md, marginBottom: space.md, width: "100%" },
  narration: { color: colors.ink, fontSize: 19, lineHeight: 28 },
});
