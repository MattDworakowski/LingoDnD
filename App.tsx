import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync } from "expo-audio";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GameProvider, useGame } from "./src/state";
import CreateScreen from "./src/screens/CreateScreen";
import MenuScreen from "./src/screens/MenuScreen";
import PlayScreen from "./src/screens/PlayScreen";
import { colors } from "./src/theme";

type Screen = "menu" | "play";

function Root() {
  const { loaded, character } = useGame();
  const [screen, setScreen] = useState<Screen>("menu");

  useEffect(() => {
    // Let narration play even if the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  if (!character) return <CreateScreen />;
  if (screen === "play") return <PlayScreen onExit={() => setScreen("menu")} />;
  return <MenuScreen onPlay={() => setScreen("play")} />;
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Root />
    </GameProvider>
  );
}
