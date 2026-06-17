// Overworld map player (B3 P1): the episode plays out on a panning map. The
// hero walks the SPINE node→node; the camera auto-pans to the active node; each
// node's scene (and its branch/combat sub-scenes) resolve in a modal over the
// map. Branches/dice/combat live in the modal, so the hero only ever walks the
// spine. Deferred to P2: zoom, fog-of-war, path-drawing art, transitions.
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
import { useEpisodeRunner, SceneInteraction, LevelUpBanner } from "../scene";
import { colors, radius, space } from "../theme";
import { Btn } from "../ui";

const HERO = 56;
const NODE = 38;
const MAP_ASPECT = 1024 / 1536; // placeholder map w/h; per-episode when real maps land
const ZOOM = 1.6; // how much bigger than the viewport the map renders (room to pan)

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

  // Displayed map size: larger than the viewport in both axes so any node can be
  // centered with room to pan around it.
  const mapW = Math.max(width, height * MAP_ASPECT) * ZOOM;
  const mapH = mapW / MAP_ASPECT;

  const nodeCenter = (n: MapNode) => ({ x: n.pos.x * mapW, y: n.pos.y * mapH });
  const heroTopLeft = (n: MapNode) => ({ x: n.pos.x * mapW - HERO / 2, y: n.pos.y * mapH - HERO / 2 });
  const cameraFor = (n: MapNode) => {
    const c = nodeCenter(n);
    return {
      x: Math.min(0, Math.max(width - mapW, width / 2 - c.x)),
      y: Math.min(0, Math.max(height - mapH, height / 2 - c.y)),
    };
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
  if (!cam.current) cam.current = new Animated.ValueXY(cameraFor(heroNode));
  const heroXY = useRef<Animated.ValueXY | null>(null);
  if (!heroXY.current) heroXY.current = new Animated.ValueXY(heroTopLeft(heroNode));
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

  // When the story advances to a NEW spine node, close the modal and walk there.
  // Sub-scenes (no `map`) keep the hero put and the modal open.
  useEffect(() => {
    const target = nodes.find((n) => n.id === runner.sceneId);
    if (!target || target.id === heroNode.id) return;
    setModalOpen(false);
    setTraveling(true);
    Animated.parallel([
      Animated.timing(heroXY.current!, { toValue: heroTopLeft(target), duration: 950, useNativeDriver: true }),
      Animated.timing(cam.current!, { toValue: cameraFor(target), duration: 950, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setHeroNode(target);
        setTraveling(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner.sceneId]);

  const atStart = heroNode.index === 0 && runner.sceneId === ep.startScene;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.mapLayer, { width: mapW, height: mapH, transform: cam.current.getTranslateTransform() }]}>
        {map ? <Image source={map} style={{ width: mapW, height: mapH }} resizeMode="cover" /> : null}

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
                style={[
                  styles.node,
                  done && styles.nodeDone,
                  isCurrent && styles.nodeCurrent,
                  isCurrent && { transform: [{ scale: pulse }] },
                ]}
              >
                <Text style={styles.nodeLabel}>{done ? "✓" : n.index + 1}</Text>
              </Animated.View>
            </Pressable>
          );
        })}

        <Animated.View style={[styles.hero, { transform: heroXY.current.getTranslateTransform() }]}>
          {avatar ? <Image source={avatar} style={styles.heroImg} resizeMode="cover" /> : null}
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

      {runner.levelUp ? <LevelUpBanner level={character.level} onClose={() => runner.setLevelUp(false)} /> : null}
    </View>
  );
}

/* ---------------------------------------------------- scene tray over the map */
// A bottom sheet that auto-sizes to its content, so plain narration leaves the
// map visible above and only dice/combat grow it (then it scrolls, capped).
function SceneModal({ runner, onExit }: { runner: ReturnType<typeof useEpisodeRunner>; onExit: () => void }) {
  const [showText, setShowText] = useState(false);
  const { text, anchor, revealNow } = runner;
  return (
    <View style={styles.modalWrap} pointerEvents="box-none">
      <View style={styles.tray}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep, overflow: "hidden" },
  mapLayer: { position: "absolute", top: 0, left: 0 },

  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md },
  topIcon: { color: colors.text, fontSize: 18, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },
  title: { flex: 1, textAlign: "center", color: colors.text, fontSize: 16, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },

  nodeHit: { position: "absolute", width: NODE, height: NODE, alignItems: "center", justifyContent: "center" },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.panelEdge, borderBottomWidth: 4, borderBottomColor: colors.panelDark, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: colors.greenDeep, borderColor: colors.green },
  nodeCurrent: { borderColor: colors.gold, borderBottomColor: colors.goldDeep, backgroundColor: colors.goldDeep },
  nodeLabel: { color: colors.text, fontSize: 16, fontWeight: "900" },

  hero: { position: "absolute", top: 0, left: 0, width: HERO, height: HERO, borderRadius: HERO / 2, borderWidth: 3, borderColor: colors.gold, backgroundColor: colors.bgDeep, overflow: "hidden" },
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
