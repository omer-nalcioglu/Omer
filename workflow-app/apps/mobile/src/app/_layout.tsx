import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { actions, boot, useApp } from "@/data/store";
import { font, palettes } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme(), p = palettes[scheme === "dark" ? "dark" : "light"];
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const loaded = useApp(s => s.loaded);
  useEffect(() => { boot(); const t = setInterval(() => actions.tick(), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (fontsLoaded && loaded) SplashScreen.hideAsync().catch(() => {}); }, [fontsLoaded, loaded]);
  if (!fontsLoaded || !loaded) return null;
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: p.bg, card: p.surface, text: p.ink, border: p.line, primary: p.accent } };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: p.bg }, headerTitleStyle: { fontFamily: font.bold }, headerBackTitle: "Geri", headerTintColor: p.accent }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: "" }} />
        <Stack.Screen name="plus" options={{ presentation: "formSheet", sheetAllowedDetents: [0.62, 0.9], sheetGrabberVisible: true, headerShown: false, contentStyle: { backgroundColor: p.surface } }} />
        <Stack.Screen name="new-job" options={{ presentation: "modal", title: "Yeni iş emri" }} />
        <Stack.Screen name="new-task" options={{ presentation: "modal", title: "Görev ver" }} />
        <Stack.Screen name="notices" options={{ presentation: "modal", title: "Bildirimler" }} />
      </Stack>
    </ThemeProvider>
  );
}
