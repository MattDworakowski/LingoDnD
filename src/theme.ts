// "Nightshade / Sternenkarte" theme (design Option D): a calm, glowing night-sky
// look — deep indigo gradient sky, gold "starlight" accents, frosted-glass cards,
// soft glows. Audio-first / bedtime-leaning. Replaces the old "Wald & Leder" wood
// palette; legacy key names are kept (remapped) so older styles re-skin cleanly.
export const colors = {
  // sky / backgrounds (solid fallbacks; the real bg is a gradient — see `grad`)
  bg: "#1a1f44",
  bgDeep: "#11122c",
  bgEpisode: "#161a3c",

  // gold starlight — primary accent / CTAs / current node
  gold: "#ffd479",
  goldDeep: "#f5b73c",
  inkOnGold: "#3a2c08",

  // frosted glass
  glassFill: "rgba(255,255,255,0.07)",
  glassFillStrong: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.16)",
  glassBorderStrong: "rgba(255,255,255,0.22)",

  // violet (XP / dice CTA), teal (player + success), pink (HP + enemy)
  violet: "#7c6cd6",
  violetLight: "#b9a8ff",
  teal: "#6fe3c4",
  tealDeep: "#3aa88c",
  pink: "#ff8aa6",
  pinkDeep: "#d96a86",

  // mini-game answer swatches
  dotTeal: "#6fe3c4",
  dotPink: "#ff8aa6",
  dotBlue: "#7cc4ff",

  // text tiers (light on dark)
  text: "#f3f2ff",
  textBright: "#eef0ff",
  textDim: "#cdb8ff",
  textDimmer: "#b9b2e0",
  textMuted: "#9b95c4",

  // tab bar
  tabBar: "rgba(20,24,56,0.72)",

  // ---- legacy tokens (remapped to Nightshade so old styles re-skin) ----
  panel: "rgba(255,255,255,0.07)", // was wood; now glass fill
  panelEdge: "rgba(255,255,255,0.16)",
  panelDark: "#11122c",
  slot: "rgba(255,255,255,0.05)",
  slotInset: "rgba(255,255,255,0.12)",
  parchment: "rgba(26,31,68,0.92)", // narration surface is now dark-frosted, not cream
  ink: "#f3f2ff", // ...so text on it is light
  bgPanel: "rgba(255,255,255,0.07)",
  accent: "#ffd479",
  accentDeep: "#f5b73c",
  green: "#6fe3c4",
  greenDeep: "#3aa88c",
  leaf: "#6fe3c4",
  leafDeep: "#3aa88c",
  red: "#ff8aa6",
  redDeep: "#d96a86",
  berry: "#ff8aa6",
  success: "#6fe3c4",
  fail: "#ff8aa6",
  crit: "#ffd479",
};

// Gradient stops (use with expo-linear-gradient `colors`).
export const grad = {
  sky: ["#1a1f44", "#232a5c", "#2e2960"],
  skyEpisode: ["#161a3c", "#11122c"],
  gold: ["#ffd479", "#f5b73c"],
  violet: ["#8d7ce6", "#6a5ad0"],
  pink: ["#ff9bb2", "#e06a86"],
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 };

// Bundled font faces (loaded in App.tsx). With these google fonts you pick the
// family that embeds the weight — don't combine with fontWeight.
export const font = {
  display: "Quicksand_600SemiBold",
  displayMed: "Quicksand_500Medium",
  displayBold: "Quicksand_700Bold",
  body: "Nunito_400Regular",
  bodyMed: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyHeavy: "Nunito_800ExtraBold",
};

// Soft drop shadow for floating glass/cards.
export const glassShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
} as const;

// Frosted-glass card look (pair with a BlurView via the GlassCard component).
export const panel = {
  backgroundColor: colors.glassFill,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.glassBorder,
} as const;

// Relic / grid slot look (empty slots are drawn dashed by the component).
export const slot = {
  backgroundColor: "rgba(255,255,255,0.05)",
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.glassBorder,
} as const;
