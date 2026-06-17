// UI theme inspired by the Fantasy Heroes editor (user reference): dark warm
// near-black backdrop, wood/leather panels with beveled edges, chunky teal/green/
// red game buttons, gold accent labels. Pairs with the chibi art direction (B4).
export const colors = {
  bg: "#1b1510",
  bgDeep: "#120e0a",

  // wood / leather panels
  panel: "#4a3826",
  panelEdge: "#765c3a", // lighter top/side bevel
  panelDark: "#291f13", // inset shadow / bottom edge
  slot: "#5a4631",
  slotInset: "#33271a",

  // parchment overlay (parent narration text) — stays readable
  parchment: "#fdf3da",
  ink: "#3a2a16",

  // chunky button fills
  teal: "#3a9aa6",
  tealDeep: "#286f78",
  green: "#86bb42",
  greenDeep: "#5f8f2e",
  red: "#d6544a",
  redDeep: "#a23b33",
  gold: "#f4c12f",
  goldDeep: "#cc9a16",

  text: "#f7eedf",
  textDim: "#c8b393",

  // ---- legacy tokens (kept so existing styles re-skin automatically) ----
  bgPanel: "#4a3826",
  accent: "#f4c12f",
  accentDeep: "#cc9a16",
  leaf: "#86bb42",
  leafDeep: "#5f8f2e",
  berry: "#d6544a",
  success: "#86bb42",
  fail: "#d6544a",
  crit: "#f4c12f",
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 };

// Reusable wood-panel look (bevel: lighter border, darker bottom edge).
export const panel = {
  backgroundColor: colors.panel,
  borderRadius: radius.lg,
  borderWidth: 2,
  borderColor: colors.panelEdge,
  borderBottomWidth: 5,
  borderBottomColor: colors.panelDark,
} as const;

// Inset "slot" look for grids/thumbnails.
export const slot = {
  backgroundColor: colors.slot,
  borderRadius: radius.sm,
  borderWidth: 2,
  borderColor: colors.slotInset,
  borderTopColor: colors.panelEdge,
} as const;
