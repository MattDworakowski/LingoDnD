import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native";
import {
  avatarImage,
  characters,
  CLASS_IDS,
  ClassId,
  Gender,
  GENDER_LABELS,
  STAT_LABELS,
} from "../content";
import { useGame } from "../state";
import { colors, panel, radius, slot, space } from "../theme";
import { Btn } from "../ui";

export default function CreateScreen() {
  const { createCharacter } = useGame();
  const [gender, setGender] = useState<Gender>("junge");
  const [classId, setClassId] = useState<ClassId>("krieger");

  const def = characters.classes[classId];
  const avatar = avatarImage(classId, gender);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Erstelle deinen Helden</Text>

        {/* gender */}
        <View style={styles.row}>
          {(["junge", "maedchen"] as Gender[]).map((g) => (
            <Chip key={g} label={GENDER_LABELS[g]} active={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>

        {/* avatar preview */}
        <View style={styles.avatarBox}>
          {avatar ? (
            <Image source={avatar} style={styles.avatar} resizeMode="contain" />
          ) : (
            <Text style={styles.dim}>{def.name}</Text>
          )}
        </View>

        {/* class */}
        <View style={styles.row}>
          {CLASS_IDS.map((c) => (
            <Chip
              key={c}
              label={characters.classes[c].name}
              active={classId === c}
              onPress={() => setClassId(c)}
            />
          ))}
        </View>

        <Text style={styles.blurb}>{def.blurb}</Text>
        <Text style={styles.primary}>
          Hauptkraft: <Text style={styles.primaryVal}>{STAT_LABELS[def.primary]}</Text>
        </Text>

        <Btn title="Los geht's!" kind="gold" onPress={() => createCharacter(gender, classId)} style={{ marginTop: space.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, alignItems: "center" },
  title: { color: colors.gold, fontSize: 28, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase", marginVertical: space.md, textAlign: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginVertical: space.sm },
  chip: {
    ...slot,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  chipActive: { borderColor: colors.gold, borderTopColor: colors.gold, backgroundColor: colors.greenDeep },
  chipText: { color: colors.textDim, fontSize: 18, fontWeight: "700" },
  chipTextActive: { color: colors.text },
  avatarBox: {
    ...panel,
    backgroundColor: colors.bgDeep,
    width: 240,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: space.md,
  },
  avatar: { width: "100%", height: "100%" },
  dim: { color: colors.textDim, fontSize: 20 },
  blurb: { color: colors.text, fontSize: 18, textAlign: "center", marginTop: space.sm, lineHeight: 26, paddingHorizontal: space.md },
  primary: { color: colors.textDim, fontSize: 16, marginTop: space.sm },
  primaryVal: { color: colors.accent, fontWeight: "800" },
});
