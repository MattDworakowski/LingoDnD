import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync } from "expo-audio";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GameProvider, useGame } from "./src/state";
import CreateScreen from "./src/screens/CreateScreen";
import MenuScreen from "./src/screens/MenuScreen";
import MapPlayScreen from "./src/screens/MapPlayScreen";
import PlayScreen from "./src/screens/PlayScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import { colors } from "./src/theme";

// B3: play on the overworld map; flip to false for the linear player fallback.
const USE_MAP = true;

type Screen = "menu" | "play" | "inventory";

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
  if (screen === "play") {
    const Play = USE_MAP ? MapPlayScreen : PlayScreen;
    return <Play onExit={() => setScreen("menu")} />;
  }
  if (screen === "inventory") return <InventoryScreen onExit={() => setScreen("menu")} />;
  return <MenuScreen onPlay={() => setScreen("play")} onInventory={() => setScreen("inventory")} />;
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Root />
    </GameProvider>
  );
}
