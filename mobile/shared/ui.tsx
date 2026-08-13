import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "./theme";

export function Screen({ children, scroll = true, bg = colors.bg }: { children: ReactNode; scroll?: boolean; bg?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>{children}</ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BtnProps = { title: string; onPress?: () => void; disabled?: boolean; icon?: ReactNode; style?: ViewStyle };

export function PrimaryButton({ title, onPress, disabled, icon }: BtnProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btn, { backgroundColor: colors.brand, opacity: disabled ? 0.6 : pressed ? 0.9 : 1 }]}>
      {icon}
      <Text style={styles.btnTextLight}>{title}</Text>
    </Pressable>
  );
}
export function GhostButton({ title, onPress, disabled, icon, style }: BtnProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btn, styles.btnGhost, { opacity: pressed ? 0.85 : 1 }, style]}>
      {icon}
      <Text style={styles.btnTextDark}>{title}</Text>
    </Pressable>
  );
}
export function DangerButton({ title, onPress, disabled, icon, style }: BtnProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btn, { backgroundColor: colors.danger, opacity: pressed ? 0.9 : 1 }, style]}>
      {icon}
      <Text style={styles.btnTextLight}>{title}</Text>
    </Pressable>
  );
}

const toneMap = {
  brand: [colors.brandSoft, colors.brandInk],
  gold: [colors.goldSoft, colors.goldInk],
  success: [colors.successSoft, colors.success],
  danger: [colors.dangerSoft, colors.dangerStrong],
  neutral: [colors.surface2, colors.ink2],
} as const;

export function Badge({ text, tone = "brand" }: { text: string; tone?: keyof typeof toneMap }) {
  const [bg, fg] = toneMap[tone];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill }}>
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: colors.ink2, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }]}>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? colors.brand : colors.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ pct, color = colors.gold }: { pct: number; color?: string }) {
  return (
    <View style={{ height: 9, backgroundColor: colors.surface2, borderRadius: radius.pill, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

// Mapa simplificado (placeholder). Integrar react-native-maps + API key en su fase.
export function MapPlaceholder({ height = 200, children }: { height?: number; children?: ReactNode }) {
  return (
    <View style={{ height, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#DCE6F5", borderWidth: 1, borderColor: colors.line }}>
      <View style={{ position: "absolute", top: "30%", left: -20, right: -20, height: 12, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", top: "62%", left: -20, right: -20, height: 12, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: "35%", top: -20, bottom: -20, width: 12, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: "70%", top: -20, bottom: -20, width: 8, backgroundColor: "#C6D3EC" }} />
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 40, alignItems: "center" }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 16 },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  btnTextLight: { color: colors.white, fontWeight: "700", fontSize: 15 },
  btnTextDark: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  stat: { flex: 1, backgroundColor: colors.surface2, borderRadius: 13, padding: 12 },
  pill: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 13 },
});
