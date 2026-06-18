import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync } from "expo-audio";
import {
  useFonts,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { GameProvider, useGame } from "./src/state";
import CreateScreen from "./src/screens/CreateScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MapPlayScreen from "./src/screens/MapPlayScreen";
import PlayScreen from "./src/screens/PlayScreen";
import { SkyBackground } from "./src/nightshade";
import { colors } from "./src/theme";

// B3: play on the overworld map; flip to false for the linear player fallback.
const USE_MAP = true;

type Screen = "home" | "play";

function Root() {
  const { loaded, character } = useGame();
  const [screen, setScreen] = useState<Screen>("home");
  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    // Let narration play even if the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  if (!loaded || !fontsLoaded) {
    return (
      <SkyBackground>
        <ActivityIndicator color={colors.gold} size="large" style={{ flex: 1 }} />
      </SkyBackground>
    );
  }

  let content: React.ReactNode;
  if (!character) content = <CreateScreen />;
  else if (screen === "play") {
    const Play = USE_MAP ? MapPlayScreen : PlayScreen;
    content = <Play onExit={() => setScreen("home")} />;
  } else content = <HomeScreen onPlay={() => setScreen("play")} />;

  return <SkyBackground episode={screen === "play"}>{content}</SkyBackground>;
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Root />
    </GameProvider>
  );
}
