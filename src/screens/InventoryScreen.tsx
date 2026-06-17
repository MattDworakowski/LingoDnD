// B5: items found on the journey shown as a dedicated slot-grid (not the inline
// chips on the menu). Tap a filled slot → item detail. Empty slots are shown.
import React, { useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FIRST_EPISODE, getEpisode, itemDef, itemImage } from "../content";
import { useGame } from "../state";
import { colors, panel, radius, slot as slotStyle, space } from "../theme";
import { Btn } from "../ui";

const MIN_SLOTS = 12;
const COLS = 4;

export default function InventoryScreen({ onExit }: { onExit: () => void }) {
  const { character, progress } = useGame();
  const { width } = useWindowDimensions();
  const [detailId, setDetailId] = useState<string | null>(null);
  if (!character) return null;

  const ep = getEpisode(progress?.episodeId ?? FIRST_EPISODE);
  const owned = character.items;
  const slotCount = Math.max(MIN_SLOTS, Math.ceil(owned.length / COLS) * COLS);
  const size = (width - space.lg * 2 - space.sm * (COLS - 1)) / COLS;

  const detail = detailId ? itemDef(ep, detailId) : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.topIcon}>‹ Menü</Text>
        </Pressable>
        <Text style={styles.title}>Beutel</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {Array.from({ length: slotCount }, (_, i) => {
            const id = owned[i];
            const img = id ? itemImage(ep, id) : undefined;
            return (
              <Pressable
                key={i}
                disabled={!id}
                onPress={() => id && setDetailId(id)}
                style={[styles.slot, { width: size, height: size }]}
              >
                {img ? <Image source={img} style={styles.slotImg} resizeMode="contain" /> : null}
              </Pressable>
            );
          })}
        </View>
        {owned.length === 0 ? <Text style={styles.empty}>Noch keine Gegenstände gefunden.</Text> : null}
      </ScrollView>

      {detail ? (
        <Pressable style={styles.overlay} onPress={() => setDetailId(null)}>
          <View style={styles.card} onStartShouldSetResponder={() => true}>
            <View style={styles.cardImgBox}>
              {itemImage(ep, detailId!) ? <Image source={itemImage(ep, detailId!)} style={styles.cardImg} resizeMode="contain" /> : null}
            </View>
            <Text style={styles.cardName}>{detail.name}</Text>
            {detail.bonus ? <Text style={styles.cardBonus}>✨ {detail.bonus}</Text> : null}
            {detail.desc ? <Text style={styles.cardDesc}>{detail.desc}</Text> : null}
            <Btn title="Schließen" kind="gold" onPress={() => setDetailId(null)} style={{ marginTop: space.md }} />
          </View>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: space.sm },
  topIcon: { color: colors.text, fontSize: 18, fontWeight: "700" },
  title: { color: colors.gold, fontSize: 20, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  scroll: { padding: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  slot: { ...slotStyle, backgroundColor: colors.slotInset, alignItems: "center", justifyContent: "center", padding: 6 },
  slotImg: { width: "100%", height: "100%" },
  empty: { color: colors.textDim, fontSize: 15, marginTop: space.lg, textAlign: "center" },

  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: space.lg },
  card: { ...panel, width: "100%", maxWidth: 360, alignItems: "center", padding: space.lg },
  cardImgBox: { ...slotStyle, backgroundColor: colors.bgDeep, width: 140, height: 140, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm },
  cardImg: { width: "100%", height: "100%" },
  cardName: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: space.md, textAlign: "center" },
  cardBonus: { color: colors.gold, fontSize: 16, fontWeight: "700", marginTop: space.xs },
  cardDesc: { color: colors.textDim, fontSize: 16, lineHeight: 23, marginTop: space.sm, textAlign: "center" },
});
