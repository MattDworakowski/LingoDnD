import React from "react";
import { Image, ScrollView, StyleSheet, Text, View, SafeAreaView } from "react-native";
import {
  avatarImage,
  characters,
  coverImage,
  FIRST_EPISODE,
  getEpisode,
  itemDef,
  STAT_LABELS,
  StatId,
} from "../content";
import { useGame } from "../state";
import { colors, panel, radius, slot, space } from "../theme";
import { Btn } from "../ui";

export default function MenuScreen({ onPlay }: { onPlay: () => void }) {
  const { character, progress, resetAll } = useGame();
  if (!character) return null;

  const def = characters.classes[character.classId];
  const ep = getEpisode(progress?.episodeId ?? FIRST_EPISODE);
  const avatar = avatarImage(character.classId, character.gender);
  const cover = coverImage(ep.id);
  const statOrder: StatId[] = ["staerke", "magie", "charisma"];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* character card */}
        <View style={styles.card}>
          <View style={styles.avatarBox}>
            {avatar ? <Image source={avatar} style={styles.avatar} resizeMode="contain" /> : null}
          </View>
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
            <Text style={styles.xp}>EP bis Stufe {character.level + 1}: {character.xp}/3</Text>
          </View>
        </View>

        {/* inventory */}
        <Text style={styles.section}>Ausrüstung</Text>
        {character.items.length === 0 ? (
          <Text style={styles.dim}>Noch keine Gegenstände gefunden.</Text>
        ) : (
          <View style={styles.itemRow}>
            {character.items.map((id) => (
              <View key={id} style={styles.itemChip}>
                <Text style={styles.itemText}>🗝️ {itemDef(ep, id)?.name ?? id}</Text>
              </View>
            ))}
          </View>
        )}

        {/* episode */}
        <Text style={styles.section}>Abenteuer</Text>
        <View style={styles.epCard}>
          {cover ? <Image source={cover} style={styles.cover} resizeMode="cover" /> : null}
          <Text style={styles.epTitle}>
            Episode {ep.episode}: {ep.title}
          </Text>
        </View>

        <Btn title={progress ? "Weiter spielen" : "Starten"} kind="gold" onPress={onPlay} style={{ marginTop: space.lg }} />
        <Btn title="Neuen Helden erstellen" kind="ghost" onPress={resetAll} style={{ marginTop: space.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg },
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
  section: { color: colors.gold, fontSize: 16, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm },
  dim: { color: colors.textDim, fontSize: 15 },
  itemRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  itemChip: { ...slot, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  itemText: { color: colors.text, fontSize: 15 },
  epCard: { ...panel, overflow: "hidden" },
  cover: { width: "100%", height: 160 },
  epTitle: { color: colors.text, fontSize: 18, fontWeight: "700", padding: space.md },
});
