// Home shell: two tabs (Reise / Held) on a frosted glass nav bar. The Reise tab
// is the "Sternenreise" constellation; the Held tab is the hero in a glowing
// halo with stats, XP, and the "Sternen-Beutel" relic slots (inventory folded in).
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, LayoutChangeEvent, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { avatarImage, characters, coverImage, FIRST_EPISODE, getEpisode, itemDef, itemImage, spineNodes, STAT_LABELS, StatId } from "../content";
import { useGame } from "../state";
import { GlassCard, Glow, IconHero, IconStar, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";
import { Btn } from "../ui";

type TabKey = "story" | "character";

export default function HomeScreen({ onPlay }: { onPlay: () => void }) {
  const [tab, setTab] = useState<TabKey>("story");
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>{tab === "story" ? <ReiseTab onPlay={onPlay} /> : <HeldTab />}</View>
      <View style={styles.tabBar}>
        <TabItem label="Reise" active={tab === "story"} onPress={() => setTab("story")} icon={<IconStar size={24} color={tab === "story" ? colors.gold : colors.textMuted} />} />
        <TabItem label="Held" active={tab === "character"} onPress={() => setTab("character")} icon={<IconHero size={24} color={tab === "character" ? colors.gold : colors.textMuted} />} />
      </View>
    </SafeAreaView>
  );
}

function TabItem({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapOn]}>{icon}</View>
      <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

/* --------------------------------------------------------- Reise (constellation) */
const NODES = [
  { x: 0.5, y: 0.88 }, // current (hero)
  { x: 0.32, y: 0.68 },
  { x: 0.62, y: 0.52 },
  { x: 0.4, y: 0.35 },
  { x: 0.58, y: 0.19 },
  { x: 0.47, y: 0.05 },
];
const LOCKET = 86;

function ReiseTab({ onPlay }: { onPlay: () => void }) {
  const { character, progress } = useGame();
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!character) return null;
  const ep = getEpisode(progress?.episodeId ?? FIRST_EPISODE);
  const spine = spineNodes(ep);
  const total = spine.length;
  const curIdx = progress ? Math.max(0, spine.findIndex((n) => n.id === progress.sceneId)) : 0;
  const sceneNo = Math.min(total, curIdx + 1);
  const pct = progress ? Math.round((sceneNo / total) * 100) : 0;
  const cover = coverImage(ep.id);
  const avatar = avatarImage(character.classId, character.gender);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const pt = (i: number) => ({ x: NODES[i].x * size.w, y: NODES[i].y * size.h });
  const hero = pt(0);

  return (
    <View style={styles.reise}>
      <Overline color={colors.textDim} style={{ textAlign: "center" }}>
        Dein Sternbild
      </Overline>
      <Text style={styles.realm}>Aldoria</Text>
      <Text style={styles.caption}>✦ …die Reise geht weiter</Text>

      <View style={styles.sky} onLayout={onLayout}>
        {size.w > 0 ? (
          <>
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              {NODES.slice(0, -1).map((_, i) => {
                const a = pt(i);
                const b = pt(i + 1);
                return (
                  <Line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.gold} strokeWidth={2} strokeDasharray={i === 0 ? undefined : "2 7"} strokeLinecap="round" opacity={Math.max(0.12, 0.6 - i * 0.11)} />
                );
              })}
              {NODES.slice(1).map((_, idx) => {
                const i = idx + 1;
                const p = pt(i);
                return <Circle key={`n${i}`} cx={p.x} cy={p.y} r={Math.max(2, 5 - i * 0.5)} fill="#fff" opacity={Math.max(0.18, 0.7 - i * 0.12)} />;
              })}
              <Circle cx={hero.x} cy={hero.y} r={LOCKET / 2 + 3} fill="none" stroke={colors.gold} strokeWidth={2} opacity={0.5} />
            </Svg>

            <Glow size={LOCKET * 2.1} color={colors.gold} opacity={0.45} style={{ position: "absolute", left: hero.x - LOCKET * 1.05, top: hero.y - LOCKET * 1.05 }} />
            <View style={[styles.locket, { left: hero.x - LOCKET / 2, top: hero.y - LOCKET / 2 }]}>
              {avatar ? <Image source={avatar} style={styles.locketImg} resizeMode="contain" /> : null}
            </View>
            <View style={[styles.youPill, { left: hero.x - 52, top: hero.y + LOCKET / 2 + 8 }]}>
              <Text style={styles.youText}>DU BIST HIER</Text>
            </View>
          </>
        ) : null}
      </View>

      <GlassCard style={styles.epCard} contentStyle={{ padding: 0 }}>
        <View style={styles.epRow}>
          {cover ? <Image source={cover} style={styles.epThumb} resizeMode="cover" /> : null}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Overline>Episode {ep.episode}</Overline>
            <Text style={styles.epTitle} numberOfLines={2}>
              {ep.title}
            </Text>
            <View style={styles.progRow}>
              <Text style={styles.progLabel}>{progress ? `Szene ${sceneNo} von ${total}` : "Noch nicht begonnen"}</Text>
              {progress ? <Text style={styles.progPct}>{pct}%</Text> : null}
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.gold }]} />
            </View>
          </View>
        </View>
        <Btn title={progress ? "Weiterreisen ✦" : "Reise beginnen ✦"} kind="gold" onPress={onPlay} style={{ margin: space.md, marginTop: space.sm }} />
      </GlassCard>
    </View>
  );
}

/* ------------------------------------------------------------- Held (character) */
const HALO = 150;
const ORBIT = 5;
const REL_COLS = 4;
const REL_MIN = 4;

function HeldTab() {
  const { character, progress, resetAll } = useGame();
  const { width } = useWindowDimensions();
  const [detailId, setDetailId] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  if (!character) return null;

  const def = characters.classes[character.classId];
  const avatar = avatarImage(character.classId, character.gender);
  const ep = getEpisode(progress?.episodeId ?? FIRST_EPISODE);
  const statOrder: StatId[] = ["staerke", "magie", "charisma"];
  const xpPct = Math.round((character.xp / 3) * 100);

  const owned = character.items;
  const slotCount = Math.max(REL_MIN, Math.ceil(owned.length / REL_COLS) * REL_COLS);
  const relSize = (width - space.lg * 2 - space.sm * (REL_COLS - 1)) / REL_COLS;
  const detail = detailId ? itemDef(ep, detailId) : undefined;

  const confirmReset = () =>
    Alert.alert("Neuen Helden erstellen?", "Dein aktueller Held und dein Fortschritt gehen dabei verloren.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: resetAll },
    ]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Held</Text>

        {/* glowing halo portrait */}
        <View style={styles.haloWrap}>
          <Animated.View style={{ position: "absolute", opacity: haloOpacity, transform: [{ scale: haloScale }] }}>
            <Glow size={HALO * 1.7} color={colors.gold} opacity={0.7} />
          </Animated.View>
          {Array.from({ length: ORBIT }, (_, i) => {
            const a = (i / ORBIT) * Math.PI * 2 - Math.PI / 2;
            const r = HALO / 2 + 12;
            return (
              <View key={i} style={{ position: "absolute", left: HALO / 2 + r * Math.cos(a) - 6, top: HALO / 2 + r * Math.sin(a) - 6 }}>
                <IconStar size={12} color={colors.gold} />
              </View>
            );
          })}
          <View style={styles.halo}>{avatar ? <Image source={avatar} style={styles.haloImg} resizeMode="contain" /> : null}</View>
        </View>
        <Text style={styles.name}>{def.name}</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>STUFE {character.level}</Text>
        </View>

        {/* stat orbs */}
        <View style={styles.statsRow}>
          {statOrder.map((s) => {
            const isPrimary = s === def.primary;
            return (
              <View key={s} style={[styles.statOrb, isPrimary && styles.statOrbPrimary]}>
                <Text style={[styles.statVal, isPrimary && { color: colors.gold }]}>
                  {character.stats[s]}
                  {isPrimary ? " ✦" : ""}
                </Text>
                <Text style={styles.statLabel}>{STAT_LABELS[s]}</Text>
              </View>
            );
          })}
        </View>

        {/* HP + XP */}
        <View style={styles.hpXpRow}>
          <Text style={styles.hpText}>❤️ {character.maxHp} HP</Text>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text style={styles.xpLabel}>EP bis Stufe {character.level + 1} · {character.xp}/3</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${xpPct}%`, backgroundColor: colors.violetLight }]} />
            </View>
          </View>
        </View>

        {/* Sternen-Beutel (relic slots) */}
        <Overline style={{ marginTop: space.lg, marginBottom: space.sm }}>Sternen-Beutel</Overline>
        <View style={styles.relGrid}>
          {Array.from({ length: slotCount }, (_, i) => {
            const id = owned[i];
            const img = id ? itemImage(ep, id) : undefined;
            return (
              <Pressable key={i} disabled={!id} onPress={() => id && setDetailId(id)} style={[styles.relSlot, { width: relSize, height: relSize }, id ? styles.relSlotFilled : styles.relSlotEmpty]}>
                {img ? <Image source={img} style={styles.relImg} resizeMode="contain" /> : null}
              </Pressable>
            );
          })}
        </View>
        {owned.length === 0 ? <Text style={styles.empty}>Noch keine Schätze gefunden.</Text> : null}

        <Pressable onPress={confirmReset} hitSlop={8} style={styles.resetLink}>
          <Text style={styles.resetText}>Neuen Helden erstellen</Text>
        </Pressable>
      </ScrollView>

      {detail ? (
        <Pressable style={styles.overlay} onPress={() => setDetailId(null)}>
          <Glow size={300} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
          <GlassCard strong style={{ width: "100%", maxWidth: 340 }} contentStyle={{ alignItems: "center", padding: space.lg }}>
            <View style={styles.cardImgBox}>{itemImage(ep, detailId!) ? <Image source={itemImage(ep, detailId!)} style={styles.relImg} resizeMode="contain" /> : null}</View>
            <Text style={styles.cardName}>{detail.name}</Text>
            {detail.bonus ? <Text style={styles.cardBonus}>✨ {detail.bonus}</Text> : null}
            {detail.desc ? <Text style={styles.cardDesc}>{detail.desc}</Text> : null}
            <Btn title="Schließen" kind="gold" onPress={() => setDetailId(null)} style={{ marginTop: space.md }} />
          </GlassCard>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  body: { flex: 1 },
  scroll: { padding: space.lg, alignItems: "center" },
  h1: { color: colors.gold, fontSize: 24, fontFamily: font.displayBold, letterSpacing: 0.5, marginBottom: space.md, alignSelf: "flex-start" },

  // Reise / constellation
  reise: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.lg },
  realm: { color: colors.textBright, fontSize: 28, fontFamily: font.displayBold, textAlign: "center", textShadowColor: "rgba(255,212,121,0.55)", textShadowRadius: 14 },
  caption: { color: colors.textDim, fontSize: 13, fontFamily: font.body, textAlign: "center", marginTop: 2, marginBottom: space.sm },
  sky: { flex: 1, marginVertical: space.sm },
  locket: { position: "absolute", width: LOCKET, height: LOCKET, borderRadius: LOCKET / 2, backgroundColor: "#11122c", borderWidth: 2, borderColor: colors.gold, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  locketImg: { width: "108%", height: "108%", marginTop: 6 },
  youPill: { position: "absolute", width: 104, alignItems: "center", paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(255,212,121,0.18)", borderWidth: 1, borderColor: colors.gold },
  youText: { color: colors.gold, fontSize: 10, fontFamily: font.bodyBold, letterSpacing: 1.5 },

  // episode card
  epCard: { marginBottom: space.sm },
  epRow: { flexDirection: "row", gap: space.md, padding: space.md, paddingBottom: 0 },
  epThumb: { width: 64, height: 64, borderRadius: radius.md },
  epTitle: { color: colors.textBright, fontSize: 18, fontFamily: font.displayBold, marginTop: 2 },
  progRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm },
  progLabel: { color: colors.textDim, fontSize: 12, fontFamily: font.body },
  progPct: { color: colors.textDim, fontSize: 12, fontFamily: font.bodyBold },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },

  // bottom nav
  tabBar: { flexDirection: "row", backgroundColor: colors.tabBar, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: space.sm, paddingBottom: space.xs },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: space.xs },
  tabIconWrap: { width: 46, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabIconWrapOn: { backgroundColor: "rgba(255,212,121,0.16)" },
  tabLabel: { color: colors.textMuted, fontSize: 11, fontFamily: font.bodyBold, marginTop: 2 },
  tabLabelOn: { color: colors.gold },

  // Held
  haloWrap: { width: HALO + 40, height: HALO + 40, alignItems: "center", justifyContent: "center", marginTop: space.md },
  halo: { width: HALO, height: HALO, borderRadius: HALO / 2, backgroundColor: "#11122c", borderWidth: 3, borderColor: colors.gold, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  haloImg: { width: "112%", height: "112%", marginTop: 8 },
  name: { color: colors.textBright, fontSize: 26, fontFamily: font.displayBold, marginTop: space.sm },
  levelPill: { backgroundColor: "rgba(255,212,121,0.18)", borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 4, marginTop: space.xs },
  levelPillText: { color: colors.gold, fontSize: 12, fontFamily: font.bodyBold, letterSpacing: 1.5 },

  statsRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg, width: "100%" },
  statOrb: { flex: 1, alignItems: "center", paddingVertical: space.md, borderRadius: radius.md, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder },
  statOrbPrimary: { borderColor: colors.gold },
  statVal: { color: colors.text, fontSize: 26, fontFamily: font.displayBold },
  statLabel: { color: colors.textDim, fontSize: 11, fontFamily: font.bodyBold, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },

  hpXpRow: { flexDirection: "row", alignItems: "center", width: "100%", marginTop: space.md },
  hpText: { color: colors.text, fontSize: 16, fontFamily: font.bodyBold },
  xpLabel: { color: colors.textDim, fontSize: 12, fontFamily: font.body, marginBottom: 2 },

  relGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, width: "100%" },
  relSlot: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: 6 },
  relSlotFilled: { backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.gold },
  relSlotEmpty: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.glassBorder, borderStyle: "dashed" },
  relImg: { width: "100%", height: "100%" },
  empty: { color: colors.textDim, fontSize: 15, fontFamily: font.body, marginTop: space.md, textAlign: "center" },

  resetLink: { marginTop: space.xl, alignSelf: "center", padding: space.sm },
  resetText: { color: colors.textMuted, fontSize: 13, fontFamily: font.body, textDecorationLine: "underline" },

  // relic detail modal
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(8,10,32,0.7)", alignItems: "center", justifyContent: "center", padding: space.lg },
  cardImgBox: { width: 140, height: 140, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: colors.glassBorder },
  cardName: { color: colors.textBright, fontSize: 22, fontFamily: font.displayBold, marginTop: space.md, textAlign: "center" },
  cardBonus: { color: colors.gold, fontSize: 16, fontFamily: font.bodyBold, marginTop: space.xs },
  cardDesc: { color: colors.textDim, fontSize: 16, fontFamily: font.body, lineHeight: 23, marginTop: space.sm, textAlign: "center" },
});
