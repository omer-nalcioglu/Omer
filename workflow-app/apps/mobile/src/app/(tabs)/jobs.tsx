import { activeStages, isLate } from "@workflow/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";

import { useApp } from "@/data/store";
import { Button, Card, Chip, Chips, Empty, Header, Icon, Rise, Screen } from "@/ui/kit";
import { JobRow } from "@/ui/job-row";
import { font, radius, usePalette } from "@/theme/tokens";

const F = [["aktif", "Aktif"], ["geciken", "Geciken"], ["sorun", "Sorunlu"], ["onay", "Onay bekleyen"], ["gorev", "Görevler"], ["biten", "Biten"]] as const;

export default function Jobs() {
  const p = usePalette(), params = useLocalSearchParams<{ f?: string }>();
  const jobs = useApp(s => s.jobs), flows = useApp(s => s.flows);
  const [f, setF] = useState<string>("aktif"), [q, setQ] = useState("");
  useEffect(() => { if (params.f) setF(params.f); }, [params.f]);
  const now = Date.now();
  const match = (k: string) => (j: (typeof jobs)[number]) => {
    const quick = j.flowId === "_task", act = j.status === "open" ? activeStages(j, flows[j.flowId]!) : [];
    if (k === "gorev") return quick && j.status !== "cancelled";
    if (quick) return false;
    if (k === "aktif") return j.status === "open" || j.status === "on_hold";
    if (k === "geciken") return isLate(j, now);
    if (k === "sorun") return act.some(s => j.stages[s.key]!.status === "blocked");
    if (k === "onay") return act.some(s => ["approval", "decision"].includes(s.kind));
    return j.status === "done";
  };
  const norm = (s: string) => s.toLocaleLowerCase("tr");
  const list = useMemo(() => jobs.filter(match(f)).filter(j => !q || norm(`${j.number} ${j.title} ${j.customerName}`).includes(norm(q))).sort((a, b) => a.due - b.due), [jobs, f, q]);
  return (
    <Screen>
      <Header eyebrow="İş emirleri" title="İşler" />
      <Rise delay={50}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: p.line2, backgroundColor: p.surface, paddingHorizontal: 14 }}>
          <Icon name="magnifyingglass" size={18} color={p.ink2} />
          <TextInput value={q} onChangeText={setQ} placeholder="İş no, müşteri ya da iş ara" placeholderTextColor={p.ink3} accessibilityLabel="İşlerde ara"
            style={{ flex: 1, fontFamily: font.regular, fontSize: 16, color: p.ink }} />
        </View>
      </Rise>
      <Rise delay={90}><Chips>{F.map(([k, l]) => <Chip key={k} label={`${l} · ${jobs.filter(match(k)).length}`} on={f === k} onPress={() => setF(k)} />)}</Chips></Rise>
      <Rise delay={130}>
        {list.length ? <Card>{list.map((j, i) => <JobRow key={j.id} job={j} first={i === 0} />)}</Card> : <Empty text={q ? `"${q}" için iş bulunamadı.` : "Bu filtrede iş yok."} />}
      </Rise>
      <Button label={f === "gorev" ? "Görev ver" : "Yeni iş emri"} icon="plus" kind="line" onPress={() => router.push(f === "gorev" ? "/new-task" : "/new-job")} />
    </Screen>
  );
}
