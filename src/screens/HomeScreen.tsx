// Home shell: two tabs (Reise / Held) on a frosted glass nav bar.
// The Reise tab is the "Sternenreise" — the campaign drawn as a constellation
// you can pan: one star per episode, completed ones lit, the hero locket on your
// furthest star (it animates up when a new episode unlocks), and tappable stars
// to select/replay any unlocked episode. The Held tab is the hero + Sternen-Beutel.
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";
import { avatarImage, characters, className, coverImage, episodesInOrder, furthestEpisodeIndex, getEpisode, itemDefAny, itemImageAny, Lang, loc, spineNodes, statLabel, StatId, TEST_EPISODE_ID } from "../content";
import { useGame } from "../state";
import { useLang, useT } from "../i18n";
import { GlassCard, Glow, IconHero, IconStar, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";
import { Btn } from "../ui";

type TabKey = "story" | "character";

export default function HomeScreen({ onPlay }: { onPlay: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("story");
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.body}>{tab === "story" ? <ReiseTab onPlay={onPlay} /> : <HeldTab />}</View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        <TabItem label={t.tabReise} active={tab === "story"} onPress={() => setTab("story")} icon={<IconStar size={24} color={tab === "story" ? colors.gold : colors.textMuted} />} />
        <TabItem label={t.tabHeld} active={tab === "character"} onPress={() => setTab("character")} icon={<IconHero size={24} color={tab === "character" ? colors.gold : colors.textMuted} />} />
      </View>
    </View>
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
const LOCKET = 80;
const MARK = 46; // episode star marker
const FUTURE = 3; // faint "upcoming" stars above the last episode
const GAP = 150;
const TOP_PAD = 80;
const BOTTOM_PAD = 290; // empty space below the bottom star so it (and a completed neighbour) clears the pinned card
// Remembered across Home unmount/remount (play is a separate screen) so that
// returning after finishing an episode animates the hero UP from the old star.
let lastFurthest = -1;

function ReiseTab({ onPlay }: { onPlay: () => void }) {
  const t = useT();
  const lang = useLang();
  const { character, progress, completed, setProgress } = useGame();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollH, setScrollH] = useState(0);

  const furthest = furthestEpisodeIndex(completed, progress?.episodeId);
  const episodes = episodesInOrder();
  const pointCount = episodes.length + FUTURE;
  const contentH = TOP_PAD + (pointCount - 1) * GAP + BOTTOM_PAD;
  const xFrac = (p: number) => (p === 0 ? 0.5 : p % 2 === 1 ? 0.32 : 0.66);
  const px = (p: number) => xFrac(p) * width;
  const py = (p: number) => contentH - BOTTOM_PAD - p * GAP;

  const startIdx = lastFurthest < 0 ? furthest : lastFurthest;
  const [selected, setSelected] = useState(furthest);
  const heroAnim = useRef(new Animated.Value(startIdx)).current;
  const heroScale = useRef(new Animated.Value(1)).current;
  const drawn = useRef(startIdx);

  // when a new episode unlocks, glide the hero locket up to its star.
  useEffect(() => {
    if (furthest !== drawn.current) {
      Animated.sequence([
        Animated.timing(heroAnim, { toValue: furthest, duration: 900, useNativeDriver: true }),
        Animated.timing(heroScale, { toValue: 1.18, duration: 140, useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      drawn.current = furthest;
      setSelected(furthest);
    }
    lastFurthest = furthest;
  }, [furthest, heroAnim, heroScale]);

  // auto-scroll so the hero's star sits in the upper third of the visible area,
  // leaving the completed star just below it clear of the pinned card.
  useEffect(() => {
    const vp = scrollH || height;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, py(furthest) - vp * 0.32), animated: true }), 140);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [furthest, contentH, scrollH, height]);

  if (!character) return null;
  const avatar = avatarImage(character.classId, character.gender);

  const epIdx = episodes.map((_, i) => i);
  const heroLeft = episodes.length > 1 ? heroAnim.interpolate({ inputRange: epIdx, outputRange: epIdx.map((i) => px(i) - LOCKET / 2) }) : px(0) - LOCKET / 2;
  const heroTop = episodes.length > 1 ? heroAnim.interpolate({ inputRange: epIdx, outputRange: epIdx.map((i) => py(i) - LOCKET / 2) }) : py(0) - LOCKET / 2;

  // selected episode → episode card
  const selEp = episodes[selected] ?? episodes[furthest];
  const selIsCompleted = completed.includes(selEp.id);
  const selStart = getEpisode(selEp.id).startScene;
  const inProgress = progress?.episodeId === selEp.id && progress.sceneId !== selStart && !selIsCompleted;
  const spine = spineNodes(selEp);
  const total = spine.length;
  const sceneNo = inProgress ? Math.min(total, Math.max(0, spine.findIndex((n) => n.id === progress!.sceneId)) + 1) : 0;
  const pct = selIsCompleted ? 100 : inProgress ? Math.round((sceneNo / total) * 100) : 0;
  const cover = coverImage(selEp.id);
  const ctaLabel = selIsCompleted ? t.ctaReplay : inProgress ? t.ctaContinue : t.ctaBegin;
  const statusLabel = selIsCompleted ? t.statusCompleted : inProgress ? t.sceneXofY(sceneNo, total) : t.statusReady;

  const playSelected = () => {
    // resume the in-progress episode; (re)start completed or fresh ones.
    if (!(progress?.episodeId === selEp.id) || selIsCompleted) setProgress({ episodeId: selEp.id, sceneId: selStart });
    onPlay();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Overline color={colors.textDim}>{t.constellation}</Overline>
        <Text style={styles.realm}>Aldoria</Text>
        <Text style={styles.caption}>{t.journeyContinues}</Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ height: contentH }} showsVerticalScrollIndicator={false} onLayout={(e) => setScrollH(e.nativeEvent.layout.height)}>
        {/* trail + faint upcoming stars */}
        <Svg width={width} height={contentH} style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: pointCount - 1 }, (_, p) => {
            const reached = p + 1 <= furthest;
            return (
              <Line
                key={`l${p}`}
                x1={px(p)}
                y1={py(p)}
                x2={px(p + 1)}
                y2={py(p + 1)}
                stroke={colors.gold}
                strokeWidth={reached ? 3 : 2}
                strokeDasharray={reached ? undefined : "2 9"}
                strokeLinecap="round"
                opacity={reached ? 0.9 : Math.max(0.12, 0.5 - (p - furthest) * 0.12)}
              />
            );
          })}
          {Array.from({ length: FUTURE }, (_, i) => {
            const p = episodes.length + i;
            return <Circle key={`f${p}`} cx={px(p)} cy={py(p)} r={Math.max(2, 5 - i * 1.1)} fill="#fff" opacity={Math.max(0.16, 0.55 - i * 0.14)} />;
          })}
        </Svg>

        {/* episode star markers (tappable to select / replay) */}
        {episodes.map((ep, p) => {
          // the bilingual test episode is always selectable; others unlock in order.
          const reached = p <= furthest || ep.id === TEST_EPISODE_ID;
          const isCurrent = p === furthest;
          return (
            <View key={ep.id} style={[styles.markerWrap, { left: px(p) - 48, top: py(p) - MARK / 2 }]}>
              <Pressable
                disabled={!reached}
                onPress={() => setSelected(p)}
                style={[styles.marker, isCurrent && { opacity: 0 }, !reached && styles.markerLocked, selected === p && !isCurrent && styles.markerSelected]}
                accessibilityLabel={t.episode(ep.episode)}
              >
                <IconStar size={reached ? 22 : 18} color={reached ? colors.gold : colors.textMuted} />
              </Pressable>
              {!isCurrent ? <Text style={[styles.markerLabel, !reached && { color: colors.textMuted }]}>{reached ? t.episode(ep.episode) : t.locked}</Text> : null}
            </View>
          );
        })}

        {/* hero locket — sits on the furthest star, glides up when one unlocks */}
        <Animated.View pointerEvents="none" style={[styles.locketWrap, { transform: [{ translateX: heroLeft }, { translateY: heroTop }, { scale: heroScale }] }]}>
          <Glow size={LOCKET * 2} color={colors.gold} opacity={0.5} style={{ position: "absolute", left: -LOCKET / 2, top: -LOCKET / 2 }} />
          <View style={styles.locket}>{avatar ? <Image source={avatar} style={styles.locketImg} resizeMode="contain" /> : null}</View>
          <View style={styles.youPill}>
            <Text style={styles.youText}>{t.youAreHere}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* pinned episode card for the selected star */}
      <GlassCard style={styles.card} contentStyle={{ padding: 0 }}>
        <View style={styles.epRow}>
          {cover ? <Image source={cover} style={styles.epThumb} resizeMode="cover" /> : null}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Overline>{t.episode(selEp.episode)}</Overline>
            <Text style={styles.epTitle} numberOfLines={2}>
              {loc(selEp.title, lang)}
            </Text>
            <View style={styles.progRow}>
              <Text style={styles.progLabel}>{statusLabel}</Text>
              {selIsCompleted || inProgress ? <Text style={styles.progPct}>{pct}%</Text> : null}
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.gold }]} />
            </View>
          </View>
        </View>
        <Btn title={ctaLabel} kind="gold" onPress={playSelected} style={{ margin: space.md, marginTop: space.sm }} />
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
  const t = useT();
  const lang = useLang();
  const { character, resetAll, setLang } = useGame();
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
  const statOrder: StatId[] = ["staerke", "magie", "charisma"];
  const xpPct = Math.round((character.xp / 3) * 100);

  const owned = character.items;
  const slotCount = Math.max(REL_MIN, Math.ceil(owned.length / REL_COLS) * REL_COLS);
  const relSize = (width - space.lg * 2 - space.sm * (REL_COLS - 1)) / REL_COLS;
  const detail = detailId ? itemDefAny(detailId) : undefined;

  const confirmReset = () =>
    Alert.alert(t.resetTitle, t.resetBody, [
      { text: t.cancel, style: "cancel" },
      { text: t.delete, style: "destructive", onPress: resetAll },
    ]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{t.held}</Text>

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
        <Text style={styles.name}>{className(character.classId, lang)}</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>{t.level(character.level)}</Text>
        </View>

        <View style={styles.statsRow}>
          {statOrder.map((s) => {
            const isPrimary = s === def.primary;
            return (
              <View key={s} style={[styles.statOrb, isPrimary && styles.statOrbPrimary]}>
                <Text style={[styles.statVal, isPrimary && { color: colors.gold }]}>
                  {character.stats[s]}
                  {isPrimary ? " ✦" : ""}
                </Text>
                <Text style={styles.statLabel}>{statLabel(s, lang)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.hpXpRow}>
          <Text style={styles.hpText}>{t.hp(character.maxHp)}</Text>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text style={styles.xpLabel}>{t.xpToNext(character.level + 1, character.xp)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${xpPct}%`, backgroundColor: colors.violetLight }]} />
            </View>
          </View>
        </View>

        <Overline style={{ marginTop: space.lg, marginBottom: space.sm }}>{t.starPouch}</Overline>
        <View style={styles.relGrid}>
          {Array.from({ length: slotCount }, (_, i) => {
            const id = owned[i];
            const img = id ? itemImageAny(id) : undefined;
            return (
              <Pressable key={i} disabled={!id} onPress={() => id && setDetailId(id)} style={[styles.relSlot, { width: relSize, height: relSize }, id ? styles.relSlotFilled : styles.relSlotEmpty]}>
                {img ? <Image source={img} style={styles.relImg} resizeMode="contain" /> : null}
              </Pressable>
            );
          })}
        </View>
        {owned.length === 0 ? <Text style={styles.empty}>{t.noTreasures}</Text> : null}

        <LangToggle value={lang} onChange={setLang} label={t.language} />

        <Pressable onPress={confirmReset} hitSlop={8} style={styles.resetLink}>
          <Text style={styles.resetText}>{t.newHero}</Text>
        </Pressable>
      </ScrollView>

      {detail ? (
        <Pressable style={styles.overlay} onPress={() => setDetailId(null)}>
          <Glow size={300} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
          <GlassCard strong style={{ width: "100%", maxWidth: 340 }} contentStyle={{ alignItems: "center", padding: space.lg }}>
            <View style={styles.cardImgBox}>
              {itemImageAny(detailId!) ? <Image source={itemImageAny(detailId!)} style={styles.relImg} resizeMode="contain" /> : null}
            </View>
            <Text style={styles.cardName}>{loc(detail.name, lang)}</Text>
            {detail.bonus ? <Text style={styles.cardBonus}>✨ {loc(detail.bonus, lang)}</Text> : null}
            {detail.desc ? <Text style={styles.cardDesc}>{loc(detail.desc, lang)}</Text> : null}
            <Btn title={t.close} kind="gold" onPress={() => setDetailId(null)} style={{ marginTop: space.md }} />
          </GlassCard>
        </Pressable>
      ) : null}
    </View>
  );
}

// DE/EN language switch (drives UI chrome + bilingual-episode narration). Lives
// on the Held screen for the ep3 A/B test; removable with the test.
function LangToggle({ value, onChange, label }: { value: Lang; onChange: (l: Lang) => void; label: string }) {
  return (
    <View style={styles.langWrap}>
      <Text style={styles.langLabel}>{label}</Text>
      <View style={styles.langSeg}>
        {(["de", "en"] as Lang[]).map((l) => (
          <Pressable key={l} onPress={() => onChange(l)} style={[styles.langPill, value === l && styles.langPillOn]} accessibilityRole="button" accessibilityLabel={l.toUpperCase()}>
            <Text style={[styles.langPillText, value === l && styles.langPillTextOn]}>{l.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  body: { flex: 1 },
  scroll: { padding: space.lg, alignItems: "center" },
  h1: { color: colors.gold, fontSize: 24, fontFamily: font.displayBold, letterSpacing: 0.5, marginBottom: space.md, alignSelf: "flex-start" },

  // Reise / constellation
  header: { alignItems: "center", paddingTop: space.lg, paddingBottom: space.sm },
  realm: { color: colors.textBright, fontSize: 28, fontFamily: font.displayBold, textAlign: "center", textShadowColor: "rgba(255,212,121,0.55)", textShadowRadius: 14 },
  caption: { color: colors.textDim, fontSize: 13, fontFamily: font.body, textAlign: "center", marginTop: 2 },

  markerWrap: { position: "absolute", width: 96, alignItems: "center" },
  marker: { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder },
  markerSelected: { borderColor: colors.gold, borderWidth: 2, backgroundColor: "rgba(255,212,121,0.16)" },
  markerLocked: { opacity: 0.45, borderStyle: "dashed" },
  markerLabel: { color: colors.textDim, fontSize: 11, fontFamily: font.bodyBold, letterSpacing: 0.5, marginTop: 5 },

  locketWrap: { position: "absolute", left: 0, top: 0, width: LOCKET, height: LOCKET },
  locket: { width: LOCKET, height: LOCKET, borderRadius: LOCKET / 2, backgroundColor: "#11122c", borderWidth: 2, borderColor: colors.gold, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  locketImg: { width: "108%", height: "108%", marginTop: 6 },
  youPill: { position: "absolute", top: LOCKET + 6, width: 104, left: (LOCKET - 104) / 2, alignItems: "center", paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(255,212,121,0.18)", borderWidth: 1, borderColor: colors.gold },
  youText: { color: colors.gold, fontSize: 10, fontFamily: font.bodyBold, letterSpacing: 1.5 },

  // episode card (pinned)
  card: { position: "absolute", left: space.lg, right: space.lg, bottom: space.md },
  epRow: { flexDirection: "row", gap: space.md, padding: space.md, paddingBottom: 0 },
  epThumb: { width: 64, height: 64, borderRadius: radius.md },
  epTitle: { color: colors.textBright, fontSize: 18, fontFamily: font.displayBold, marginTop: 2 },
  progRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm },
  progLabel: { color: colors.textDim, fontSize: 12, fontFamily: font.body },
  progPct: { color: colors.textDim, fontSize: 12, fontFamily: font.bodyBold },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },

  // bottom nav
  tabBar: { flexDirection: "row", backgroundColor: colors.tabBar, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: space.xs },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 2 },
  tabIconWrap: { width: 42, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
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

  langWrap: { marginTop: space.xl, flexDirection: "row", alignItems: "center", gap: space.sm },
  langLabel: { color: colors.textDim, fontSize: 13, fontFamily: font.bodyBold },
  langSeg: { flexDirection: "row", backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.pill, padding: 3, gap: 3 },
  langPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill },
  langPillOn: { backgroundColor: "rgba(255,212,121,0.18)", borderWidth: 1, borderColor: colors.gold },
  langPillText: { color: colors.textMuted, fontSize: 13, fontFamily: font.bodyBold, letterSpacing: 1 },
  langPillTextOn: { color: colors.gold },

  resetLink: { marginTop: space.lg, alignSelf: "center", padding: space.sm },
  resetText: { color: colors.textMuted, fontSize: 13, fontFamily: font.body, textDecorationLine: "underline" },

  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(8,10,32,0.7)", alignItems: "center", justifyContent: "center", padding: space.lg },
  cardImgBox: { width: 140, height: 140, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: colors.glassBorder },
  cardName: { color: colors.textBright, fontSize: 22, fontFamily: font.displayBold, marginTop: space.md, textAlign: "center" },
  cardBonus: { color: colors.gold, fontSize: 16, fontFamily: font.bodyBold, marginTop: space.xs },
  cardDesc: { color: colors.textDim, fontSize: 16, fontFamily: font.body, lineHeight: 23, marginTop: space.sm, textAlign: "center" },
});
