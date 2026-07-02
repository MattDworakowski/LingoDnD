// Linear player: a full-screen "stage" presentation (kept as a fallback to the
// overworld MapPlayScreen). Scene logic lives in the shared scene engine.
import React, { useEffect, useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEpisodeRunner, SceneInteraction, LevelUpBanner, ItemFoundBanner } from "../scene";
import { useT } from "../i18n";
import { Glow, Overline } from "../nightshade";
import { colors, font, radius, space } from "../theme";

export default function PlayScreen({ onExit }: { onExit: () => void }) {
  const t = useT();
  const runner = useEpisodeRunner();
  const { ep, text, anchor, revealNow, character, levelUp, setLevelUp } = runner;

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
          <Text style={styles.topIcon}>{t.backJourney}</Text>
        </Pressable>
        <Pressable onPress={() => setShowText((v) => !v)} hitSlop={12}>
          <Text style={styles.topIcon}>{showText ? "✕" : "📖"}</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {shownImage ? (
          <>
            <Glow size={300} color={colors.gold} opacity={0.35} style={{ position: "absolute" }} />
            <Image source={shownImage} style={styles.anchorImg} resizeMode="contain" />
          </>
        ) : null}
        {showText ? (
          <ScrollView style={styles.textPanel} contentContainerStyle={{ padding: space.md }}>
            <Overline style={{ marginBottom: 6 }}>{t.theStory}</Overline>
            <Text style={styles.narration}>{text}</Text>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.actionArea}>
        <SceneInteraction runner={runner} onExit={onExit} />
      </View>

      {runner.itemFound ? <ItemFoundBanner ep={ep} itemId={runner.itemFound} onClose={() => runner.setItemFound(null)} /> : null}
      {levelUp ? <LevelUpBanner level={character.level} onClose={() => setLevelUp(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: space.sm },
  topIcon: { color: colors.text, fontSize: 17, fontFamily: font.bodyBold },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  anchorImg: { width: "90%", height: "100%" },
  textPanel: { position: "absolute", left: space.md, right: space.md, top: space.md, bottom: space.md, backgroundColor: "rgba(22,26,60,0.92)", borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md },
  narration: { color: colors.text, fontSize: 19, lineHeight: 28, fontFamily: font.body },
  actionArea: { minHeight: 220, padding: space.md, justifyContent: "center" },
});
