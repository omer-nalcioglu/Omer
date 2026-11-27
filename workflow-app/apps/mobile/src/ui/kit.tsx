import * as Haptics from "expo-haptics";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { font, radius, space, type, usePalette, type Palette } from "@/theme/tokens";

/**
 * Tasarım dilinin tek kaynağı. Ekranlar renk, boyut ya da köşe değeri yazmaz; bu parçaları kullanır.
 * Böylece uygulama büyüdükçe görünüm dağılmaz.
 */
export const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

export function Icon({ name, size = 22, color, weight = "medium" }: { name: SFSymbol; size?: number; color?: string; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  const p = usePalette();
  return <SymbolView name={name} size={size} tintColor={color ?? p.ink} weight={weight} fallback={<View style={{ width: size, height: size }} />} />;
}

/** Ekrana girişte kısa yükselme (0,5 sn). "Hareketi azalt" açıksa React Native animasyonu kendiliğinden kısaltır. */
export function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start(); }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}

export function Screen({ children, scroll = true, padBottom = 120 }: { children: ReactNode; scroll?: boolean; padBottom?: number }) {
  const p = usePalette(), insets = useSafeAreaInsets();
  const body = <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: padBottom, gap: space.lg }}>{children}</View>;
  return <View style={{ flex: 1, backgroundColor: p.bg }}>{scroll ? <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}</View>;
}

export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const p = usePalette();
  return (
    <Rise style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md, paddingTop: space.md }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <T style={[type.label, { color: p.ink2 }]}>{eyebrow}</T> : null}
        <T style={[type.title, { color: p.ink, marginTop: 4 }]} accessibilityRole="header">{title}</T>
      </View>
      {right}
    </Rise>
  );
}

export function T(props: React.ComponentProps<typeof Text>) {
  const p = usePalette();
  return <Text {...props} style={[{ fontFamily: font.regular, color: p.ink, fontSize: 16 }, props.style]} />;
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: "bad" | "warn" | "ok" | "accent" }) {
  const p = usePalette();
  const border = tone === "bad" ? p.bad : tone === "warn" ? p.warn : tone === "ok" ? p.ok : tone === "accent" ? p.accentLine : p.line;
  const bg = tone === "bad" ? p.badSoft : tone === "warn" ? p.warnSoft : tone === "ok" ? p.okSoft : p.surface;
  return <View style={[{ backgroundColor: tone && tone !== "accent" ? bg : p.surface, borderColor: tone && tone !== "accent" ? border + "55" : border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" }, style]}>{children}</View>;
}

export function Row({ title, sub, left, right, onPress, first, accessibilityLabel }: { title: string; sub?: string; left?: ReactNode; right?: ReactNode; onPress?: () => void; first?: boolean; accessibilityLabel?: string }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg, minHeight: 64,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: p.line, backgroundColor: pressed ? p.surface2 : "transparent" }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={type.bodyStrong} numberOfLines={2}>{title}</T>
        {sub ? <T style={[type.small, { color: p.ink2 }]} numberOfLines={2}>{sub}</T> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron.right" size={14} color={p.ink3} /> : null)}
    </Pressable>
  );
}

export type Tone = "ok" | "warn" | "bad" | "accent" | "mute";
const toneColors = (p: Palette, t: Tone) => ({
  ok: [p.okSoft, p.ok], warn: [p.warnSoft, p.warn], bad: [p.badSoft, p.bad], accent: [p.accentSoft, p.accent2], mute: [p.sunk, p.ink2],
}[t]);

export function Pill({ label, tone = "mute", live }: { label: string; tone?: Tone; live?: boolean }) {
  const p = usePalette(), [bg, fg] = toneColors(p, tone);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live) return;
    const a = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, [live, pulse]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 26 }}>
      {tone !== "mute" ? <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg, opacity: live ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 1 }} /> : null}
      <T style={{ fontFamily: font.bold, fontSize: 12, color: fg }}>{label}</T>
    </View>
  );
}

export function Button({ label, onPress, kind = "primary", disabled, icon, big }: { label: string; onPress: () => void; kind?: "primary" | "ok" | "line" | "ghost" | "danger"; disabled?: boolean; icon?: SFSymbol; big?: boolean }) {
  const p = usePalette();
  const bg = disabled ? p.sunk : kind === "primary" ? p.accent : kind === "ok" ? p.ok : kind === "danger" ? p.badSoft : kind === "line" ? p.surface : "transparent";
  const fg = disabled ? p.ink2 : kind === "primary" ? p.onAccent : kind === "ok" ? "#ffffff" : kind === "danger" ? p.bad : kind === "ghost" ? p.accent2 : p.ink;
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [{ minHeight: big ? 56 : 48, borderRadius: big ? 18 : radius.md, backgroundColor: bg, borderWidth: kind === "line" ? 1 : 0, borderColor: p.line2,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: kind === "primary" && !disabled ? p.accent : "#000", shadowOpacity: (kind === "primary" || kind === "ok") && !disabled ? 0.22 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <T style={{ fontFamily: font.bold, fontSize: big ? 17 : 16, color: fg }}>{label}</T>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? p.ink : p.line, backgroundColor: on ? p.ink : p.surface,
        alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <T style={{ fontFamily: font.semibold, fontSize: 14, color: on ? p.surface : p.ink }}>{label}</T>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

export function Progress({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "bad" | "ok" }) {
  const p = usePalette(), v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: pct, duration: 800, useNativeDriver: false }).start(); }, [pct, v]);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: p.sunk, overflow: "hidden" }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: tone === "bad" ? p.bad : tone === "ok" ? p.ok : p.accent, width: v.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }} />
    </View>
  );
}

const AV = ["#4f46e5", "#c2410c", "#0f766e", "#7c3aed", "#be185d", "#b45309", "#1d4ed8", "#15803d"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr");
  const color = AV[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AV.length];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}><T style={{ color: "#fff", fontFamily: font.bold, fontSize: size * 0.36 }}>{initials}</T></View>;
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 28 }}><T style={type.h2} accessibilityRole="header">{title}</T>{right}</View>
      {children}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  const p = usePalette();
  return <View style={{ padding: space.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: p.line2, backgroundColor: p.surface }}><T style={[type.small, { textAlign: "center", color: p.ink2 }]}>{text}</T></View>;
}

export function Field({ label, ...rest }: TextInputProps & { label: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <T style={[type.small, { fontFamily: font.bold }]}>{label}</T>
      <TextInput placeholderTextColor={p.ink3} {...rest} accessibilityLabel={label}
        style={[{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: p.line2, backgroundColor: p.surface, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16, color: p.ink }, rest.multiline ? { minHeight: 88, paddingTop: 12, textAlignVertical: "top" } : null]} />
    </View>
  );
}

export function Check({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: on ? p.accentLine : p.line, backgroundColor: on ? p.accentSoft : p.surface }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? p.accent : p.line2, backgroundColor: on ? p.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
        {on ? <Icon name="checkmark" size={13} color="#fff" weight="bold" /> : null}
      </View>
      <T style={{ flex: 1, color: on ? p.ink2 : p.ink, textDecorationLine: on ? "line-through" : "none" }}>{label}</T>
    </Pressable>
  );
}
