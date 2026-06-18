// Nightshade buttons: rounded gradient fills with a soft tinted glow (gold for
// primary CTAs, violet for secondary actions), plus round icon buttons (frosted
// glass or gold gradient). Press = gentle sink. No more wood bevel.
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, glassShadow, grad, radius } from "./theme";

type Kind = "primary" | "gold" | "danger" | "ghost";

const GRADS: Record<Exclude<Kind, "ghost">, { colors: readonly string[]; text: string; shadow: string }> = {
  primary: { colors: grad.violet, text: "#ffffff", shadow: "#6a5ad0" },
  gold: { colors: grad.gold, text: colors.inkOnGold, shadow: "#f5b73c" },
  danger: { colors: grad.pink, text: "#ffffff", shadow: "#e06a86" },
};

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
  if (kind === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.ghost,
          disabled && { opacity: 0.4 },
          pressed && !disabled && { transform: [{ translateY: 2 }], opacity: 0.85 },
          style,
        ]}
      >
        <Text style={styles.ghostText}>{title}</Text>
      </Pressable>
    );
  }
  const g = GRADS[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { borderRadius: radius.md, shadowColor: g.shadow, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { transform: [{ translateY: 2 }], shadowRadius: 6 },
        style,
      ]}
    >
      <LinearGradient colors={g.colors as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.btn}>
        <Text style={[styles.text, { color: g.text }]}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// Round icon button. "wood" kind is now a frosted-glass circle (replay/secondary);
// "gold" is a gold gradient circle (the primary play/advance action).
export function IconButton({
  icon,
  onPress,
  kind = "wood",
  size = 60,
  disabled = false,
  accessibilityLabel,
  style,
  children,
}: {
  icon?: string;
  onPress: () => void;
  kind?: "wood" | "gold";
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}) {
  const gold = kind === "gold";
  const inner = children ?? <Text style={{ fontSize: size * 0.42, color: gold ? colors.inkOnGold : colors.text }}>{icon}</Text>;
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
          ...glassShadow,
          shadowColor: gold ? "#f5b73c" : "#000",
        },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { transform: [{ translateY: 2 }], shadowRadius: 8 },
        style,
      ]}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: gold ? colors.goldDeep : colors.glassBorder }}>
        {gold ? (
          <LinearGradient colors={grad.gold as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassFill }]} />
          </>
        )}
        {inner}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 15, paddingHorizontal: 26, borderRadius: radius.md, alignItems: "center" },
  text: { fontSize: 18, fontFamily: font.bodyHeavy, letterSpacing: 0.8, textTransform: "uppercase" },
  ghost: { paddingVertical: 13, paddingHorizontal: 24, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glassFill },
  ghostText: { fontSize: 15, fontFamily: font.bodyBold, color: colors.textDim },
});
