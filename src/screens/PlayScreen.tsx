// Linear player: the full-screen "stage" presentation (kept as a fallback to
// the overworld MapPlayScreen). Scene logic lives in the shared scene engine.
import React, { useEffect, useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEpisodeRunner, SceneInteraction, LevelUpBanner } from "../scene";
import { colors, radius, space } from "../theme";

export default function PlayScreen({ onExit }: { onExit: () => void }) {
  const runner = useEpisodeRunner();
  const { text, anchor, revealNow, character, levelUp, setLevelUp } = runner;

  const [showText, setShowText] = useState(false);
  const [shownImage, setShownImage] = useState<number | undefined>(undefined);

  // B1: keep the revealed image on screen across scenes; swap only when a new
  // anchor reveals (an anchor-less scene leaves the previous picture up).
  useEffect(() => {
    if (anchor && revealNow) setShownImage(anchor);
  }, [anchor, revealNow]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.topIcon}>‹ Menü</Text>
        </Pressable>
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={12}>
          <Text style={styles.topIcon}>{showText ? "📖 ✕" : "📖"}</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {shownImage ? <Image source={shownImage} style={styles.anchorImg} resizeMode="contain" /> : null}
        {showText ? (
          <ScrollView style={styles.textPanel} contentContainerStyle={{ padding: space.md }}>
            <Text style={styles.narration}>{text}</Text>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.actionArea}>
        <SceneInteraction runner={runner} onExit={onExit} />
      </View>

      {levelUp ? <LevelUpBanner level={character.level} onClose={() => setLevelUp(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: space.sm },
  topIcon: { color: colors.text, fontSize: 18, fontWeight: "700" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  anchorImg: { width: "90%", height: "100%" },
  textPanel: { position: "absolute", left: space.md, right: space.md, top: space.md, bottom: space.md, backgroundColor: "rgba(253,243,218,0.96)", borderRadius: radius.md },
  narration: { color: colors.ink, fontSize: 20, lineHeight: 30 },
  actionArea: { minHeight: 220, padding: space.md, justifyContent: "center" },
});
