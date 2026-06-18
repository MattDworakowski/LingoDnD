// Nightshade design system — shared visual primitives reused across every screen:
// the gradient sky + twinkles backdrop, frosted-glass cards, soft radial glows,
// an animated audio equalizer, and an SVG icon set (star/hero/replay/play/heart,
// HP star-pips, and the celestial faceted-gem d20).
import React, { useEffect, useId, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, G, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors, font, glassShadow, grad, radius, space } from "./theme";

// ---------------------------------------------------------------------------
// Sky backdrop
// ---------------------------------------------------------------------------

/** Full-screen indigo gradient sky with a soft twinkle field behind children. */
export function SkyBackground({
  children,
  episode = false,
  twinkles = true,
  style,
}: {
  children?: React.ReactNode;
  episode?: boolean;
  twinkles?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bgDeep }, style]}>
      <LinearGradient
        colors={episode ? grad.skyEpisode : grad.sky}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {twinkles ? <Twinkles /> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** A few tiny stars that slowly pulse, randomly scattered across the sky. */
export function Twinkles({ count = 16, style }: { count?: number; style?: ViewStyle }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        top: `${Math.round(Math.random() * 92)}%`,
        left: `${Math.round(Math.random() * 94)}%`,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 2600,
        dur: 1800 + Math.random() * 2200,
      })),
    [count]
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {stars.map((s, i) => (
        <Twinkle key={i} {...s} />
      ))}
    </View>
  );
}

function Twinkle({ top, left, size, delay, dur }: { top: string; left: string; size: number; delay: number; dur: number }) {
  const v = useRef(new Animated.Value(Math.random())).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.2, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, delay, dur]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: top as any,
        left: left as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff",
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.9] }),
        shadowColor: "#cdd6ff",
        shadowOpacity: 0.9,
        shadowRadius: 3,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Frosted glass card
// ---------------------------------------------------------------------------

/** Frosted-glass surface: real expo-blur + translucent fill + hairline border. */
export function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 24,
  rounded = radius.lg,
  strong = false,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  intensity?: number;
  rounded?: number;
  strong?: boolean;
}) {
  return (
    <View style={[{ borderRadius: rounded }, glassShadow, style]}>
      <View style={{ borderRadius: rounded, overflow: "hidden", borderWidth: 1, borderColor: strong ? colors.glassBorderStrong : colors.glassBorder }}>
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? colors.glassFillStrong : colors.glassFill }]} />
        <View style={[{ padding: space.md }, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Soft radial glow (SVG RadialGradient — RN has no CSS radial-gradient)
// ---------------------------------------------------------------------------

export function Glow({
  size = 220,
  color = colors.gold,
  opacity = 0.5,
  style,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  style?: ViewStyle;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="55%" stopColor={color} stopOpacity={opacity * 0.4} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill={`url(#glow-${id})`} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overline label
// ---------------------------------------------------------------------------

export function Overline({ children, color = colors.gold, style }: { children: React.ReactNode; color?: string; style?: any }) {
  return <Text style={[{ color, fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }, style]}>{children}</Text>;
}

// ---------------------------------------------------------------------------
// Audio equalizer (animated gold bars while narration plays)
// ---------------------------------------------------------------------------

export function Equalizer({ color = colors.gold, bars = 4, size = 22 }: { color?: string; bars?: number; size?: number }) {
  const vals = useRef(Array.from({ length: bars }, () => new Animated.Value(0.4))).current;
  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 340 + i * 90, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.35, duration: 300 + i * 70, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l, i) => setTimeout(() => l.start(), i * 110));
    return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: size, gap: 3 }}>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: color,
            height: v.interpolate({ inputRange: [0, 1], outputRange: [size * 0.25, size] }),
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SVG icon set
// ---------------------------------------------------------------------------

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const step = Math.PI / points;
  let a = -Math.PI / 2;
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    a += step;
  }
  return pts.join(" ");
}

export function IconStar({ size = 26, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points={starPoints(12, 12, 10, 4.4)} fill={color} />
    </Svg>
  );
}

export function IconHero({ size = 26, color = colors.textDim }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7.5} r={3.6} fill={color} />
      <Path d="M4.5 20c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7z" fill={color} />
    </Svg>
  );
}

export function IconReplay({ size = 26, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 12a6.5 6.5 0 1 1 1.9 4.6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Polygon points="3,8 8.4,8 5.7,13" fill={color} />
    </Svg>
  );
}

export function IconPlay({ size = 26, color = colors.inkOnGold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="8,5 19,12 8,19" fill={color} />
    </Svg>
  );
}

export function IconSkip({ size = 26, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="5,5 13,12 5,19" fill={color} />
      <Polygon points="12,5 20,12 12,19" fill={color} />
    </Svg>
  );
}

export function IconPause({ size = 26, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={5} width={4} height={14} rx={1.4} fill={color} />
      <Rect x={14} y={5} width={4} height={14} rx={1.4} fill={color} />
    </Svg>
  );
}

export function IconHeart({ size = 18, color = colors.pink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21s-7.3-4.6-9.6-9.1C.9 8.6 2.6 5.5 5.8 5.5c2 0 3.3 1.1 4.2 2.4.9-1.3 2.2-2.4 4.2-2.4 3.2 0 4.9 3.1 3.4 6.4C19.3 16.4 12 21 12 21z" fill={color} />
    </Svg>
  );
}

/** One HP "star pip" — filled (alive) or faint outline (lost). */
export function StarPip({ size = 16, color = colors.teal, filled = true }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon
        points={starPoints(12, 12, 10, 4.4)}
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : 1.6}
        opacity={filled ? 1 : 0.4}
      />
    </Svg>
  );
}

/** Celestial faceted-gem d20 showing the rolled number. */
export function GemD20({ size = 96, value, color = colors.gold }: { size?: number; value?: number | null; color?: string }) {
  const id = useId().replace(/:/g, "");
  const c = size / 2;
  const r = size * 0.46;
  // outer hexagon
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
  });
  const top = hex[0];
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Glow size={size * 1.5} color={color} opacity={0.4} style={{ position: "absolute" }} />
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`gem-${id}`} cx="50%" cy="38%" r="65%">
            <Stop offset="0%" stopColor="#3a3f7a" stopOpacity={1} />
            <Stop offset="100%" stopColor="#1b1f48" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Polygon points={hex.join(" ")} fill={`url(#gem-${id})`} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {/* facet lines from centre to each vertex + a top inner triangle */}
        <G stroke={color} strokeWidth={1} opacity={0.4}>
          {hex.map((p, i) => {
            const [x, y] = p.split(",");
            return <Path key={i} d={`M${c},${c} L${x},${y}`} />;
          })}
          <Path d={`M${hex[5].split(",")[0]},${hex[5].split(",")[1]} L${top.split(",")[0]},${top.split(",")[1]} L${hex[1].split(",")[0]},${hex[1].split(",")[1]}`} fill="none" />
        </G>
      </Svg>
      <Text style={{ position: "absolute", color: colors.text, fontFamily: font.displayBold, fontSize: size * 0.34 }}>
        {value != null ? value : ""}
      </Text>
    </View>
  );
}
