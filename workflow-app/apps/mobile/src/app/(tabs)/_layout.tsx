import { router } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import type { SFSymbol } from "expo-symbols";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { can, homeOf, useApp, visibleNotice } from "@/data/store";
import { Icon, T, tap } from "@/ui/kit";
import { font, usePalette } from "@/theme/tokens";

/** Rol başına en fazla 5 sekme; ortada ＋. Prototipteki alt menüyle aynı kurgu. */
const TABS: Record<string, { label: string; icon: SFSymbol }> = {
  index: { label: "Panel", icon: "house" },
  jobs: { label: "İşler", icon: "list.bullet" },
  new: { label: "Yeni", icon: "plus" },
  chat: { label: "Sohbet", icon: "bubble.left" },
  more: { label: "Daha fazla", icon: "square.grid.2x2" },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const p = usePalette(), insets = useSafeAreaInsets();
  const me = useApp(s => s.me);
  const home = homeOf(me), mgr = home === "boss" || home === "foreman";
  const unread = useApp(s => s.notices.filter(n => !n.read && visibleNotice(n)).length);
  const visible = mgr ? ["index", "jobs", ...(can("create") ? ["new"] : []), "chat", "more"] : ["index", "chat", "more"];
  return (
    <View style={{ flexDirection: "row", backgroundColor: p.surface, borderTopWidth: 1, borderTopColor: p.line, paddingBottom: insets.bottom, paddingTop: 6 }}>
      {state.routes.filter(r => visible.includes(r.name)).map(r => {
        const i = state.routes.indexOf(r), focused = state.index === i, meta = TABS[r.name]!;
        const label = r.name === "index" && !mgr ? (home === "driver" ? "Teslimatlar" : "Görevlerim") : meta.label;
        if (r.name === "new") return (
          <Pressable key={r.key} onPress={() => { tap(); router.push("/plus"); }} accessibilityRole="button" accessibilityLabel="Yeni oluştur" style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <View style={{ width: 54, height: 54, marginTop: -24, borderRadius: 18, backgroundColor: p.accent, alignItems: "center", justifyContent: "center", shadowColor: p.accent, shadowOpacity: 0.38, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}>
              <Icon name="plus" size={24} color={p.onAccent} weight="bold" />
            </View>
            <T style={{ fontFamily: font.semibold, fontSize: 12, color: p.ink2 }}>Yeni</T>
          </Pressable>
        );
        return (
          <Pressable key={r.key} onPress={() => { tap(); if (!focused) navigateToTab(r.key); }} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
            style={{ flex: 1, alignItems: "center", gap: 3, minHeight: 56, justifyContent: "center" }}>
            <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: focused ? p.accentSoft : "transparent" }}>
              <Icon name={(focused ? `${meta.icon}.fill` : meta.icon) as SFSymbol} size={20} color={focused ? p.accent : p.ink2} />
              {r.name === "chat" && unread ? <View style={{ position: "absolute", top: -3, right: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: p.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><T style={{ color: "#fff", fontSize: 11, fontFamily: font.bold }}>{unread > 99 ? "99+" : unread}</T></View> : null}
            </View>
            <T style={{ fontFamily: focused ? font.heavy : font.semibold, fontSize: 12, color: focused ? p.accent2 : p.ink2 }}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jobs" />
      <Tabs.Screen name="new" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
