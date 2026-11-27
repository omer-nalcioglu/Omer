import { activeStages, isLate, tasksFor } from "@workflow/core";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { firstName, getState, homeOf, useApp, visibleNotice } from "@/data/store";
import { Card, Empty, Header, Icon, Rise, Row, Screen, Section, T, tap } from "@/ui/kit";
import { JobRow } from "@/ui/job-row";
import { TaskCard } from "@/ui/task-card";
import { font, radius, space, type, usePalette } from "@/theme/tokens";

function Bell() {
  const p = usePalette(), n = useApp(s => s.notices.filter(x => !x.read && visibleNotice(x)).length);
  return (
    <Pressable onPress={() => { tap(); router.push("/notices"); }} accessibilityRole="button" accessibilityLabel={`Bildirimler${n ? `, ${n} yeni` : ""}`}
      style={{ width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}>
      <Icon name="bell" size={21} />
      {n ? <View style={{ position: "absolute", top: -5, right: -5, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: p.bad, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: p.bg }}><T style={{ color: "#fff", fontFamily: font.bold, fontSize: 11 }}>{n}</T></View> : null}
    </Pressable>
  );
}

export default function Home() {
  const me = useApp(s => s.me), jobs = useApp(s => s.jobs), flows = useApp(s => s.flows), biz = useApp(s => s.businessName);
  const p = usePalette(), home = homeOf(me), mine = tasksFor(jobs, flows, me);
  const greet = new Date().getHours() < 12 ? "Günaydın" : new Date().getHours() < 18 ? "İyi günler" : "İyi akşamlar";
  const date = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

  if (home === "worker" || home === "driver") {
    return (
      <Screen>
        <Header eyebrow={`${biz} · ${getState().people.find(x => x.id === me)?.title ?? ""}`} title={home === "driver" ? "Teslimatlar" : "Görevlerim"} right={<Bell />} />
        <Rise delay={60}><T style={type.bodyStrong}>{mine.length ? `Bugün ${mine.length} görevin var.` : "Şu an bekleyen görevin yok."}</T></Rise>
        {mine.map(({ job, stage }, i) => <Rise key={job.id + stage.key} delay={100 + i * 60}><TaskCard job={job} flow={flows[job.flowId]!} stage={stage} /></Rise>)}
        {!mine.length ? <Empty text="Yeni bir görev sana düştüğünde burada görünür ve bildirim gelir." /> : null}
      </Screen>
    );
  }

  const open = jobs.filter(j => j.status === "open"), now = Date.now();
  const late = open.filter(j => isLate(j, now));
  const blocked = open.filter(j => activeStages(j, flows[j.flowId]!).some(s => j.stages[s.key]!.status === "blocked"));
  const approvals = open.filter(j => activeStages(j, flows[j.flowId]!).some(s => ["approval", "decision"].includes(s.kind)));
  const parts = [late.length && `${late.length} iş gecikmede`, blocked.length && `${blocked.length} işte sorun var`, approvals.length && `${approvals.length} iş onay bekliyor`].filter(Boolean);
  const tone = late.length || blocked.length ? "bad" : parts.length ? "warn" : "ok";
  const attention = [...new Set([...blocked, ...late, ...approvals])];

  return (
    <Screen>
      <Header eyebrow={`${biz} · ${date}`} title={`${greet}, ${firstName(me)}`} right={<Bell />} />
      <Rise delay={60}>
        <Card tone={tone as "bad" | "warn" | "ok"} style={{ padding: space.lg, flexDirection: "row", gap: space.md, alignItems: "center" }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: tone === "ok" ? p.okSoft : tone === "bad" ? p.badSoft : p.warnSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={tone === "ok" ? "checkmark" : "exclamationmark.triangle"} color={tone === "ok" ? p.ok : tone === "bad" ? p.bad : p.warn} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: font.heavy, fontSize: 17, lineHeight: 23 }}>{parts.length ? parts.join(", ") : "Her şey yolunda"}</T>
            <T style={[type.small, { color: p.ink2 }]}>{open.length} aktif iş · {getState().people.length} kişilik ekip</T>
          </View>
        </Card>
      </Rise>
      <Rise delay={110} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[[open.length, "Aktif iş", "aktif"], [late.length, "Geciken", "geciken"], [approvals.length, "Onay bekleyen", "onay"], [jobs.filter(j => j.status === "done").length, "Biten", "biten"]].map(([n, l, f]) => (
          <Pressable key={l as string} onPress={() => { tap(); router.push({ pathname: "/(tabs)/jobs", params: { f: f as string } }); }} accessibilityRole="button" accessibilityLabel={`${n} ${l}`}
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 92, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: space.lg, justifyContent: "space-between", transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <T style={[type.num, { color: l === "Geciken" && n ? p.bad : p.ink }]}>{n as number}</T>
            <T style={[type.small, { color: p.ink2 }]}>{l as string}</T>
          </Pressable>
        ))}
      </Rise>
      {mine.length ? <Rise delay={160}><Section title="Sana düşenler">{mine.map(({ job, stage }) => <TaskCard key={job.id + stage.key} job={job} flow={flows[job.flowId]!} stage={stage} compact />)}</Section></Rise> : null}
      <Rise delay={200}>
        <Section title="Dikkat gerektirenler">
          {attention.length ? <Card>{attention.slice(0, 6).map((j, i) => <JobRow key={j.id} job={j} first={i === 0} />)}</Card> : <Empty text="Geciken, takılan ya da onay bekleyen iş yok." />}
        </Section>
      </Rise>
      <Rise delay={240}>
        <Section title="Kısayollar">
          <Card>
            <Row first title="Görev ver" sub="Kime, ne, ne zamana" left={<Icon name="bolt" color={p.accent} />} onPress={() => router.push("/new-task")} />
            <Row title="Yeni iş emri" sub="Akış seç, müşteri ve termin gir" left={<Icon name="list.bullet.rectangle" color={p.accent} />} onPress={() => router.push("/new-job")} />
          </Card>
        </Section>
      </Rise>
    </Screen>
  );
}
