import React, { useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { avatarImage, characters, classBlurb, className, CLASS_IDS, ClassId, Gender, genderLabel, Lang, statLabel } from "../content";
import { useGame } from "../state";
import { useLang, useT } from "../i18n";
import { GlassCard, Glow, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";
import { Btn } from "../ui";

export default function CreateScreen() {
  const t = useT();
  const lang = useLang();
  const { createCharacter, setLang } = useGame();
  const [gender, setGender] = useState<Gender>("junge");
  const [classId, setClassId] = useState<ClassId>("krieger");

  const def = characters.classes[classId];
  const avatar = avatarImage(classId, gender);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.langRow}>
          {(["de", "en"] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[styles.langPill, lang === l && styles.langPillOn]} accessibilityRole="button" accessibilityLabel={l.toUpperCase()}>
              <Text style={[styles.langPillText, lang === l && styles.langPillTextOn]}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Overline color={colors.textDim} style={{ marginTop: space.sm }}>
          {t.createOverline}
        </Overline>
        <Text style={styles.title}>{t.createTitle}</Text>

        <View style={styles.row}>
          {(["junge", "maedchen"] as Gender[]).map((g) => (
            <Chip key={g} label={genderLabel(g, lang)} active={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>

        <View style={styles.avatarOuter}>
          <Glow size={300} color={colors.gold} opacity={0.4} style={{ position: "absolute" }} />
          <GlassCard style={styles.avatarBox} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {avatar ? <Image source={avatar} style={styles.avatar} resizeMode="contain" /> : <Text style={styles.dim}>{className(classId, lang)}</Text>}
          </GlassCard>
        </View>

        <View style={styles.row}>
          {CLASS_IDS.map((c) => (
            <Chip key={c} label={className(c, lang)} active={classId === c} onPress={() => setClassId(c)} />
          ))}
        </View>

        <Text style={styles.blurb}>{classBlurb(classId, lang)}</Text>
        <Text style={styles.primary}>
          {t.mainPower} <Text style={styles.primaryVal}>{statLabel(def.primary, lang)}</Text>
        </Text>

        <Btn title={t.letsGo} kind="gold" onPress={() => createCharacter(gender, classId)} style={{ marginTop: space.lg, alignSelf: "stretch" }} />
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
  langRow: { flexDirection: "row", alignSelf: "flex-end", gap: 4, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.pill, padding: 3 },
  langPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.pill },
  langPillOn: { backgroundColor: "rgba(255,212,121,0.18)", borderWidth: 1, borderColor: colors.gold },
  langPillText: { color: colors.textMuted, fontSize: 12, fontFamily: font.bodyBold, letterSpacing: 1 },
  langPillTextOn: { color: colors.gold },
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
