import { blockers, FlowError, type FlowDef, type Job, type StageDef } from "@workflow/core";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { dayLabel } from "@/data/format";
import { actions, firstName, getState } from "@/data/store";
import { Button, Check, Chip, Chips, Icon, Pill, T } from "@/ui/kit";
import { font, radius, space, type, usePalette } from "@/theme/tokens";

const clock = (from: number) => {
  const s = Math.max(0, Math.floor((Date.now() - from) / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":");
};

const ISSUES = ["Malzeme eksik", "Makine arızası", "Ölçü / çizim hatalı", "İş güvenliği", "Diğer"];

/** Çalışana düşen bir aşama: tek kart, tek ana düğme. Kontrol adımları, karar dalları, fotoğraf ve sorun bildirimi burada. */
export function TaskCard({ job, flow, stage, compact }: { job: Job; flow: FlowDef; stage: StageDef; compact?: boolean }) {
  const p = usePalette(), run = job.stages[stage.key]!;
  const [choice, setChoice] = useState<string | undefined>();
  const [, force] = useState(0);
  useEffect(() => { if (run.status !== "working") return; const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t); }, [run.status]);
  const quick = job.flowId === "_task";
  const steps = quick ? String(job.data.adimlar ?? "").split("\n").filter(Boolean) : stage.checklist ?? [];
  const left = blockers(job, flow, stage.key, choice);
  const act = (fn: () => void) => { try { fn(); } catch (e) { Alert.alert("Olmadı", e instanceof FlowError ? e.message : String(e)); } };
  const status = run.status === "working" ? <Pill label="Çalışıyor" tone="accent" live /> : run.status === "blocked" ? <Pill label="Sorun bildirildi" tone="bad" /> : <Pill label={stage.kind === "approval" || stage.kind === "decision" ? "Onayını bekliyor" : "Bekliyor"} tone="warn" />;
  const by = job.createdBy !== getState().me ? ` · ${firstName(job.createdBy).toLocaleUpperCase("tr")} VERDİ` : "";

  return (
    <View style={{ backgroundColor: p.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: run.status === "working" ? p.accentLine : run.status === "blocked" ? p.bad + "66" : p.line, padding: 18, gap: 14,
      shadowColor: p.accent, shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <T style={[type.label, { color: p.ink2, flexShrink: 1 }]} numberOfLines={1}>{quick ? `GÖREV${by}` : `İŞ EMRİ #${job.number}`}</T>
        {status}
      </View>
      <View style={{ gap: 4 }}>
        <T style={type.h3}>{quick ? job.title : `${stage.name} · ${job.title}`}</T>
        {job.data.not ? <T style={{ color: p.ink2 }}>{String(job.data.not)}</T> : null}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="clock" size={16} color={p.ink3} /><T style={type.small}>Teslim {dayLabel(job.due)}</T></View>
          {job.customerName ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="person" size={16} color={p.ink3} /><T style={type.small}>{job.customerName}</T></View> : null}
          {!quick ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="shippingbox" size={16} color={p.ink3} /><T style={type.small}>{job.qty} {job.unit}</T></View> : null}
        </View>
      </View>

      {run.status === "blocked" && run.issue ? (
        <View style={{ backgroundColor: p.badSoft, borderRadius: radius.md, padding: 12, gap: 2 }}>
          <T style={{ fontFamily: font.bold, color: p.bad }}>{run.issue.type}</T>
          <T style={type.small}>{run.issue.note || "Not yok"} · ustabaşı ve patron bilgilendirildi</T>
        </View>
      ) : null}

      {run.status === "working" && stage.kind !== "timer" ? <T style={{ fontFamily: font.heavy, fontSize: 40, letterSpacing: -1, textAlign: "center", color: p.accent, fontVariant: ["tabular-nums"] }}>{clock(run.startedAt ?? Date.now())}</T> : null}
      {stage.kind === "timer" ? <T style={[type.small, { color: p.ink2 }]}>Süre doluyor: {run.dueAt ? `${dayLabel(run.dueAt)} ${new Date(run.dueAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "-"} · kendiliğinden geçer</T> : null}

      {steps.length && !compact ? <View style={{ gap: 8 }}>{steps.map((s, i) => <Check key={i} label={s} on={!!run.checks[i]} onPress={() => actions.toggleCheck(job.id, stage.key, i)} />)}</View> : null}

      {stage.kind === "decision" && run.status !== "blocked" ? (
        <View style={{ gap: 8 }}><T style={[type.small, { fontFamily: font.bold }]}>Karar</T><Chips>{(stage.branches ?? []).map(b => <Chip key={b.id} label={b.label} on={choice === b.id} onPress={() => setChoice(b.id)} />)}</Chips></View>
      ) : null}

      {run.status === "blocked" ? null : run.status === "ready" && stage.kind !== "decision" && stage.kind !== "approval" ? (
        <Button big label="İşe başla" icon="play.fill" onPress={() => act(() => actions.start(job.id, stage.key))} />
      ) : stage.kind === "timer" ? null : (
        <View style={{ gap: 8 }}>
          {!compact ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Button kind="line" icon="camera" label={run.photos ? `Fotoğraf · ${run.photos}` : "Fotoğraf"} onPress={() => actions.addPhoto(job.id, stage.key)} /></View>
              <View style={{ flex: 1 }}><Button kind="danger" icon="exclamationmark.triangle" label="Sorun bildir" onPress={() => Alert.alert("Ne sorun var?", undefined, [...ISSUES.map(t => ({ text: t, onPress: () => act(() => actions.reportIssue(job.id, stage.key, t, "")) })), { text: "Vazgeç", style: "cancel" as const }])} /></View>
            </View>
          ) : null}
          <Button big kind="ok" disabled={left.length > 0} label={left.length ? left[0]! : stage.kind === "decision" ? "Kararı kaydet" : stage.kind === "approval" ? "Onayla" : "İşi tamamla"}
            onPress={() => act(() => { actions.complete(job.id, stage.key, choice ? { choice } : {}); })} />
          {compact ? <Button kind="ghost" label="Ayrıntılar" onPress={() => router.push(`/job/${job.id}`)} /> : null}
        </View>
      )}
    </View>
  );
}
