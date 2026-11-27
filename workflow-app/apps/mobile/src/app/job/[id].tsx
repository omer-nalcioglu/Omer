import { activeStages, progress, type StageStatus } from "@workflow/core";
import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";

import { dayLabel, hm, isLate, jobState } from "@/data/format";
import { actions, can, firstName, useApp } from "@/data/store";
import { Button, Card, Empty, Header, Pill, Progress, Rise, Screen, Section, T } from "@/ui/kit";
import { TaskCard } from "@/ui/task-card";
import { font, space, type, usePalette } from "@/theme/tokens";

const MARK: Record<StageStatus, string> = { done: "✓", skipped: "–", ready: "•", working: "•", blocked: "!", locked: "" };

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const job = useApp(s => s.jobs.find(j => j.id === id)), flows = useApp(s => s.flows), me = useApp(s => s.me);
  if (!job) return <Screen><Empty text="İş bulunamadı." /></Screen>;
  const flow = flows[job.flowId]!, st = jobState(job, flow), act = job.status === "open" ? activeStages(job, flow) : [];
  const mineOrManager = (k: string) => job.stages[k]!.crew.includes(me) || job.stages[k]!.owner === me || can("approve");
  const quick = job.flowId === "_task";
  return (
    <Screen padBottom={48}>
      <Stack.Screen options={{ title: quick ? "Görev" : `#${job.number}` }} />
      <Header eyebrow={quick ? `Görev · ${firstName(job.createdBy)} verdi` : `İş emri #${job.number} · ${flow.name}`} title={job.title} />
      <Rise delay={50} style={{ gap: 10 }}>
        <T style={[type.small, { color: p.ink2 }]}>{[job.customerName, quick ? "" : `${job.qty} ${job.unit}`, `Termin ${dayLabel(job.due)}`].filter(Boolean).join(" · ")}</T>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <Pill label={st.label} tone={st.tone} live={st.live} />
          {isLate(job, Date.now()) ? <Pill label="Gecikti" tone="bad" /> : null}
          {job.urgent ? <Pill label="Acil" tone="accent" /> : null}
        </View>
        {!quick ? <Progress pct={progress(job)} tone={st.tone === "bad" ? "bad" : job.status === "done" ? "ok" : "accent"} /> : null}
      </Rise>

      {act.filter(s => mineOrManager(s.key)).map((s, i) => <Rise key={s.key} delay={90 + i * 50}><TaskCard job={job} flow={flow} stage={s} /></Rise>)}
      {act.filter(s => job.stages[s.key]!.status === "blocked" && can("assign")).map(s => (
        <Button key={`r${s.key}`} kind="line" icon="checkmark.circle" label={`${s.name}: sorun çözüldü`} onPress={() => actions.resolve(job.id, s.key)} />
      ))}

      {Object.keys(job.data).length && !quick ? (
        <Rise delay={140}><Section title="Bilgiler"><Card style={{ padding: space.lg, gap: 8 }}>
          {flow.fields.filter(f => job.data[f.key] !== undefined && job.data[f.key] !== "").map(f => (
            <View key={f.key} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><T style={[type.small, { color: p.ink2 }]}>{f.label}</T><T style={{ fontFamily: font.bold }}>{String(job.data[f.key])}{f.unit ? ` ${f.unit}` : ""}</T></View>
          ))}
        </Card></Section></Rise>
      ) : null}

      {!quick ? (
        <Rise delay={170}><Section title="Aşamalar">
          <Card style={{ padding: space.lg, gap: 0 }}>
            {flow.stages.map((s, i) => {
              const r = job.stages[s.key]!, last = i === flow.stages.length - 1;
              const c = r.status === "done" ? p.ok : r.status === "blocked" ? p.bad : ["ready", "working"].includes(r.status) ? p.accent : p.line2;
              return (
                <View key={s.key} style={{ flexDirection: "row", gap: 12, opacity: r.status === "skipped" ? 0.45 : 1 }}>
                  <View style={{ alignItems: "center", width: 28 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c, backgroundColor: r.status === "done" ? p.ok : p.surface, alignItems: "center", justifyContent: "center" }}>
                      <T style={{ fontFamily: font.heavy, fontSize: 12, color: r.status === "done" ? "#fff" : c }}>{MARK[r.status] || i + 1}</T>
                    </View>
                    {!last ? <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: r.status === "done" ? p.ok : p.line }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 14, gap: 2 }}>
                    <T style={{ fontFamily: font.bold }}>{s.name}</T>
                    <T style={[type.small, { color: p.ink2 }]}>{r.status === "done" ? `${firstName(r.owner ?? "")} · ${r.doneAt ? `${dayLabel(r.doneAt)} ${hm(r.doneAt)}` : ""}` : r.status === "skipped" ? "Atlandı" : r.owner ? `${firstName(r.owner)}${r.status === "working" ? " · çalışıyor" : r.status === "ready" ? " · sırada" : ""}` : "Bekliyor"}</T>
                  </View>
                </View>
              );
            })}
          </Card>
        </Section></Rise>
      ) : null}

      <Rise delay={200}><Section title="Hareketler">
        <Card style={{ padding: space.lg, gap: 10 }}>
          {[...job.log].reverse().slice(0, 12).map((l, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <View style={{ marginTop: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? p.accent : p.line2 }} />
              <T style={[type.small, { flex: 1 }]}>{firstName(l.by)}: {l.text}</T>
              <T style={[type.small, { color: p.ink3 }]}>{hm(l.at)}</T>
            </View>
          ))}
        </Card>
      </Section></Rise>

      {job.status === "open" && can("approve") && !quick ? (
        <Button kind="ghost" icon="arrow.uturn.backward" label="Bir aşamaya geri gönder" onPress={() => {
          const from = act[0]; if (!from) return;
          const back = flow.stages.filter(s => job.stages[s.key]!.status === "done");
          Alert.alert("Nereye geri gönderilsin?", undefined, [...back.slice(-4).map(s => ({ text: s.name, onPress: () => { try { actions.sendBack(job.id, from.key, s.key, "Patron geri gönderdi"); } catch (e) { Alert.alert("Olmadı", String((e as Error).message)); } } })), { text: "Vazgeç", style: "cancel" as const }]);
        }} />
      ) : null}
    </Screen>
  );
}
