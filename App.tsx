import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync } from "expo-audio";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GameProvider, useGame } from "./src/state";
import CreateScreen from "./src/screens/CreateScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MapPlayScreen from "./src/screens/MapPlayScreen";
import PlayScreen from "./src/screens/PlayScreen";
import { colors } from "./src/theme";

// B3: play on the overworld map; flip to false for the linear player fallback.
const USE_MAP = true;

type Screen = "home" | "play";

function Root() {
  const { loaded, character } = useGame();
  const [screen, setScreen] = useState<Screen>("home");

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
  if (screen === "play") {
    const Play = USE_MAP ? MapPlayScreen : PlayScreen;
    return <Play onExit={() => setScreen("home")} />;
  }
  return <HomeScreen onPlay={() => setScreen("play")} />;
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Root />
    </GameProvider>
  );
}
