import React, { useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { avatarImage, characters, CLASS_IDS, ClassId, Gender, GENDER_LABELS, STAT_LABELS } from "../content";
import { useGame } from "../state";
import { GlassCard, Glow, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";
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
        <Overline color={colors.textDim} style={{ marginTop: space.sm }}>
          Dein Abenteuer beginnt
        </Overline>
        <Text style={styles.title}>Erstelle deinen Helden</Text>

        <View style={styles.row}>
          {(["junge", "maedchen"] as Gender[]).map((g) => (
            <Chip key={g} label={GENDER_LABELS[g]} active={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>

        <View style={styles.avatarOuter}>
          <Glow size={300} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
          <GlassCard style={styles.avatarBox} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {avatar ? <Image source={avatar} style={styles.avatar} resizeMode="contain" /> : <Text style={styles.dim}>{def.name}</Text>}
          </GlassCard>
        </View>

        <View style={styles.row}>
          {CLASS_IDS.map((c) => (
            <Chip key={c} label={characters.classes[c].name} active={classId === c} onPress={() => setClassId(c)} />
          ))}
        </View>

        <Text style={styles.blurb}>{def.blurb}</Text>
        <Text style={styles.primary}>
          Hauptkraft: <Text style={styles.primaryVal}>{STAT_LABELS[def.primary]}</Text>
        </Text>

        <Btn title="Los geht's ✦" kind="gold" onPress={() => createCharacter(gender, classId)} style={{ marginTop: space.lg, alignSelf: "stretch" }} />
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
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: space.lg, alignItems: "center" },
  title: { color: colors.textBright, fontSize: 28, fontFamily: font.displayBold, marginBottom: space.md, textAlign: "center", textShadowColor: "rgba(255,212,121,0.5)", textShadowRadius: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginVertical: space.sm },
  chip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder },
  chipActive: { borderColor: colors.gold, backgroundColor: "rgba(255,212,121,0.18)" },
  chipText: { color: colors.textDim, fontSize: 17, fontFamily: font.bodyBold },
  chipTextActive: { color: colors.gold },
  avatarOuter: { width: 240, height: 280, alignItems: "center", justifyContent: "center", marginVertical: space.md },
  avatarBox: { width: 240, height: 280 },
  avatar: { width: "100%", height: "100%" },
  dim: { color: colors.textDim, fontSize: 20, fontFamily: font.body },
  blurb: { color: colors.text, fontSize: 17, fontFamily: font.body, textAlign: "center", marginTop: space.sm, lineHeight: 25, paddingHorizontal: space.md },
  primary: { color: colors.textDim, fontSize: 16, fontFamily: font.body, marginTop: space.sm },
  primaryVal: { color: colors.gold, fontFamily: font.bodyBold },
});
