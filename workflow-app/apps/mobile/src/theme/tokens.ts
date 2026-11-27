import { useColorScheme } from "react-native";

/** Yumuşak tasarım dili v3: açık lila zemin, beyaz kartlar, çivit vurgu. Prototip (workflow/index.html) ile aynı değerler. */
const light = {
  bg: "#f4f5fb", surface: "#ffffff", surface2: "#f6f7fc", sunk: "#eceef6",
  ink: "#111827", ink2: "#4b5563", ink3: "#5b6474", line: "#e5e7f0", line2: "#d3d6e4",
  accent: "#4f46e5", accent2: "#3730a3", onAccent: "#ffffff", accentSoft: "#eef0ff", accentLine: "#c7c9f9",
  ok: "#15803d", okSoft: "#dcfce7", warn: "#92400e", warnSoft: "#fef3c7", bad: "#b91c1c", badSoft: "#fee2e2",
  scrim: "rgba(17,18,32,0.42)",
};
const dark: typeof light = {
  bg: "#0f1117", surface: "#171a23", surface2: "#1d2130", sunk: "#0b0d12",
  ink: "#eef0f6", ink2: "#b8bdcc", ink3: "#959bad", line: "#2a2f3d", line2: "#3a4152",
  accent: "#a5b4fc", accent2: "#c7d2fe", onAccent: "#1e1b4b", accentSoft: "#23254a", accentLine: "#3f4380",
  ok: "#4ade80", okSoft: "#10291a", warn: "#fbbf24", warnSoft: "#2c2210", bad: "#fca5a5", badSoft: "#351616",
  scrim: "rgba(0,0,0,0.6)",
};
export type Palette = typeof light;
export const palettes = { light, dark };

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, sheet: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const font = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  heavy: "PlusJakartaSans_800ExtraBold",
};
export const type = {
  title: { fontFamily: font.heavy, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  h2: { fontFamily: font.bold, fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  h3: { fontFamily: font.heavy, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.9, textTransform: "uppercase" as const },
  num: { fontFamily: font.heavy, fontSize: 34, letterSpacing: -1, lineHeight: 38 },
};

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
