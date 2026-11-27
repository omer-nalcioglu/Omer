import type { Job } from "@workflow/core";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { dayLabel, isLate, jobState, progress } from "@/data/format";
import { getState } from "@/data/store";
import { Pill, Progress, T, tap } from "@/ui/kit";
import { font, space, type, usePalette } from "@/theme/tokens";

export function JobRow({ job, first }: { job: Job; first?: boolean }) {
  const p = usePalette(), flow = getState().flows[job.flowId], st = jobState(job, flow), late = isLate(job, Date.now()), pct = progress(job);
  const quick = job.flowId === "_task";
  return (
    <Pressable onPress={() => { tap(); router.push(`/job/${job.id}`); }} accessibilityRole="button" accessibilityLabel={`${job.title}, ${st.label}`}
      style={({ pressed }) => ({ padding: space.lg, gap: 8, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: p.line, backgroundColor: pressed ? p.surface2 : "transparent" })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <T style={[type.bodyStrong, { flex: 1 }]} numberOfLines={2}>{job.title}</T>
        <T style={{ fontFamily: font.medium, fontSize: 13, color: p.ink2, fontVariant: ["tabular-nums"] }}>#{job.number}</T>
      </View>
      <T style={[type.small, { color: p.ink2 }]}>{quick ? "Görev" : job.customerName} · Termin {dayLabel(job.due)}</T>
      {!quick ? <Progress pct={pct} tone={late || st.tone === "bad" ? "bad" : job.status === "done" ? "ok" : "accent"} /> : null}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Pill label={st.label} tone={st.tone} live={st.live} />
        {late ? <Pill label="Gecikti" tone="bad" /> : null}
        {job.urgent ? <Pill label="Acil" tone="accent" /> : null}
        {!quick ? <T style={{ marginLeft: "auto", fontFamily: font.bold, fontSize: 13, color: p.ink2 }}>%{pct}</T> : null}
      </View>
    </Pressable>
  );
}
