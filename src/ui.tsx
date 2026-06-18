import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius } from "./theme";

type Kind = "primary" | "gold" | "danger" | "ghost";

const FILLS: Record<Kind, { bg: string; edge: string; text: string }> = {
  primary: { bg: colors.teal, edge: colors.tealDeep, text: "#ffffff" },
  gold: { bg: colors.gold, edge: colors.goldDeep, text: "#3a2a10" },
  danger: { bg: colors.red, edge: colors.redDeep, text: "#ffffff" },
  ghost: { bg: "transparent", edge: "transparent", text: colors.text },
};

// Chunky beveled game button: a darker bottom edge gives 3D depth; pressing
// sinks it (translateY + thinner edge), like the reference UI.
export function Btn({
  title,
  onPress,
  kind = "primary",
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: Kind;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const f = FILLS[kind];
  const ghost = kind === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: f.bg, borderBottomColor: f.edge },
        ghost && styles.ghost,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: f.text }, ghost && styles.ghostText]}>{title}</Text>
    </Pressable>
  );
}

// Round chunky icon-only button (emoji glyph) — for pre-readers. Same bevel/sink
// feel as Btn. `accessibilityLabel` keeps it usable for screen readers.
export function IconButton({
  icon,
  onPress,
  kind = "wood",
  size = 60,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  icon: string;
  onPress: () => void;
  kind?: "wood" | "gold";
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const gold = kind === "gold";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: gold ? colors.gold : colors.slot,
          borderWidth: 2,
          borderColor: gold ? colors.goldDeep : colors.slotInset,
          borderTopColor: gold ? colors.gold : colors.panelEdge,
          borderBottomWidth: 5,
          borderBottomColor: gold ? colors.goldDeep : colors.panelDark,
        },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.44 }}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: radius.md,
    alignItems: "center",
    borderBottomWidth: 5,
  },
  text: { fontSize: 20, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  ghost: { borderWidth: 2, borderColor: colors.textDim, borderBottomWidth: 2 },
  ghostText: { fontSize: 16, fontWeight: "700", textTransform: "none" },
});
