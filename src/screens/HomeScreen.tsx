// Home shell: three tabs (Abenteuer / Beutel / Held) switched by an icon bottom
// nav. Playing an episode is a separate full-screen mode (see App.tsx).
import React, { useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { avatarImage, characters, coverImage, FIRST_EPISODE, getEpisode, STAT_LABELS, StatId } from "../content";
import { useGame } from "../state";
import { colors, panel, radius, slot, space } from "../theme";
import { Btn } from "../ui";
import InventoryTab from "./InventoryTab";

type TabKey = "story" | "inventory" | "character";
const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "story", icon: "🗺️", label: "Abenteuer" },
  { key: "inventory", icon: "🎒", label: "Beutel" },
  { key: "character", icon: "🛡️", label: "Held" },
];

export default function HomeScreen({ onPlay }: { onPlay: () => void }) {
  const [tab, setTab] = useState<TabKey>("story");
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        {tab === "story" ? <StoryTab onPlay={onPlay} /> : tab === "inventory" ? <InventoryTab /> : <CharacterTab />}
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityLabel={t.label}>
              <Text style={[styles.tabIcon, !on && styles.tabIconOff]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function StoryTab({ onPlay }: { onPlay: () => void }) {
  const { character, progress } = useGame();
  if (!character) return null;
  const ep = getEpisode(progress?.episodeId ?? FIRST_EPISODE);
  const cover = coverImage(ep.id);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Abenteuer</Text>
      <View style={styles.epCard}>
        {cover ? <Image source={cover} style={styles.cover} resizeMode="cover" /> : null}
        <Text style={styles.epTitle}>
          Episode {ep.episode}: {ep.title}
        </Text>
      </View>
      <Btn title={progress ? "Weiter spielen" : "Starten"} kind="gold" onPress={onPlay} style={{ marginTop: space.lg }} />
    </ScrollView>
  );
}

function CharacterTab() {
  const { character, resetAll } = useGame();
  if (!character) return null;
  const def = characters.classes[character.classId];
  // Deliberately low-key + confirmed: a kid tapped this by accident and wiped the
  // hero. (Will move to a Settings tab later.)
  const confirmReset = () =>
    Alert.alert("Neuen Helden erstellen?", "Dein aktueller Held und dein Fortschritt gehen dabei verloren.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: resetAll },
    ]);
  const avatar = avatarImage(character.classId, character.gender);
  const statOrder: StatId[] = ["staerke", "magie", "charisma"];
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Held</Text>
      <View style={styles.card}>
        <View style={styles.avatarBox}>{avatar ? <Image source={avatar} style={styles.avatar} resizeMode="contain" /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.level}>Stufe {character.level}</Text>
          <View style={styles.hpRow}>
            <Text style={styles.hpLabel}>❤️ {character.maxHp} HP</Text>
          </View>
          <View style={styles.statsRow}>
            {statOrder.map((s) => (
              <View key={s} style={styles.stat}>
                <Text style={styles.statVal}>{character.stats[s]}</Text>
                <Text style={styles.statLabel}>{STAT_LABELS[s]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.xp}>
            EP bis Stufe {character.level + 1}: {character.xp}/3
          </Text>
        </View>
      </View>
      <Pressable onPress={confirmReset} hitSlop={8} style={styles.resetLink}>
        <Text style={styles.resetText}>Neuen Helden erstellen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  scroll: { padding: space.lg },
  h1: { color: colors.gold, fontSize: 22, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: space.md },

  // bottom nav
  tabBar: { flexDirection: "row", backgroundColor: colors.panel, borderTopWidth: 2, borderTopColor: colors.panelEdge, paddingTop: space.sm },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: space.xs },
  tabIcon: { fontSize: 26 },
  tabIconOff: { opacity: 0.5 },
  tabLabel: { color: colors.textDim, fontSize: 12, fontWeight: "700", marginTop: 2 },
  tabLabelOn: { color: colors.gold },

  // character card
  card: { ...panel, flexDirection: "row", padding: space.md, gap: space.md },
  avatarBox: { ...slot, backgroundColor: colors.bgDeep, width: 110, height: 140, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  avatar: { width: "100%", height: "100%" },
  name: { color: colors.text, fontSize: 24, fontWeight: "800" },
  level: { color: colors.accent, fontSize: 18, fontWeight: "700", marginTop: 2 },
  hpRow: { marginTop: space.xs },
  hpLabel: { color: colors.text, fontSize: 16 },
  statsRow: { flexDirection: "row", gap: space.md, marginTop: space.sm },
  stat: { alignItems: "center" },
  statVal: { color: colors.text, fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: 12 },
  xp: { color: colors.textDim, fontSize: 13, marginTop: space.sm },

  // episode card
  epCard: { ...panel, overflow: "hidden" },
  cover: { width: "100%", height: 180 },
  epTitle: { color: colors.text, fontSize: 18, fontWeight: "700", padding: space.md },

  // subtle (parent-facing) reset link
  resetLink: { marginTop: space.xl, alignSelf: "center", padding: space.sm },
  resetText: { color: colors.textDim, fontSize: 13, textDecorationLine: "underline" },
});
