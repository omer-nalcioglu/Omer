import { FlowError, tl, type FieldDef, type JobData } from "@workflow/core";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { actions, useApp } from "@/data/store";
import { Button, Chip, Chips, Field, T } from "@/ui/kit";
import { font, space, type, usePalette } from "@/theme/tokens";

const due = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(17, 0, 0, 0); return d.getTime(); };
const DUE = [["Yarın", 1], ["3 gün", 3], ["1 hafta", 7], ["2 hafta", 14]] as const;

function CustomField({ f, value, set }: { f: FieldDef; value: JobData[string]; set: (v: JobData[string]) => void }) {
  const p = usePalette();
  if (f.type === "select") return (
    <View style={{ gap: 8 }}><T style={[type.small, { fontFamily: font.bold }]}>{f.label}{f.requiredAt === "create" ? " *" : ""}</T>
      <Chips>{(f.options ?? []).map(o => <Chip key={o} label={o} on={value === o} onPress={() => set(o)} />)}</Chips></View>
  );
  return <Field label={`${f.label}${f.requiredAt === "create" ? " *" : ""}`} value={value == null ? "" : String(value)} keyboardType={f.type === "number" ? "number-pad" : "default"}
    onChangeText={t => set(f.type === "number" ? (t ? Number(t.replace(",", ".")) : null) : t)} placeholderTextColor={p.ink3} />;
}

export default function NewJob() {
  const p = usePalette(), flows = useApp(s => s.flows);
  const list = Object.values(flows).filter(f => !f.hidden);
  const [flowId, setFlowId] = useState(list[0]?.id ?? ""), [title, setTitle] = useState(""), [cust, setCust] = useState(""), [qty, setQty] = useState("1");
  const [d, setD] = useState(2), [amount, setAmount] = useState(""), [urgent, setUrgent] = useState(false), [data, setData] = useState<JobData>({});
  const flow = flows[flowId];
  const fields = (flow?.fields ?? []).filter(f => f.requiredAt === "create" || !f.requiredAt);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}><T style={[type.small, { fontFamily: font.bold }]}>İş akışı</T>
          <Chips>{list.map(f => <Chip key={f.id} label={f.name} on={f.id === flowId} onPress={() => { setFlowId(f.id); setData({}); }} />)}</Chips>
          {flow ? <T style={[type.small, { color: p.ink2 }]}>{flow.stages.map(s => s.name).join(" → ")}</T> : null}
        </View>
        <Field label="Müşteri" value={cust} onChangeText={setCust} placeholder="Ör: Kaya İnşaat" />
        <Field label="İşin adı" value={title} onChangeText={setTitle} placeholder="Ör: Çelik kapı, 12 adet" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Miktar" value={qty} onChangeText={setQty} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Tutar (₺, KDV hariç)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" /></View>
        </View>
        <View style={{ gap: 8 }}><T style={[type.small, { fontFamily: font.bold }]}>Termin</T>
          <Chips>{DUE.map(([l, n]) => <Chip key={l} label={l} on={d === n} onPress={() => setD(n)} />)}<Chip label="Acil" on={urgent} onPress={() => setUrgent(!urgent)} /></Chips>
        </View>
        {fields.map(f => <CustomField key={f.key} f={f} value={data[f.key] ?? null} set={v => setData({ ...data, [f.key]: v })} />)}
        <Button big kind="ok" disabled={!title.trim() || !cust.trim()} label={!cust.trim() ? "Müşteriyi yaz" : !title.trim() ? "İşin adını yaz" : "İşi aç"} onPress={() => {
          try {
            const job = actions.createJob(flowId, { title: title.trim(), customerName: cust.trim(), due: due(d), qty: Number(qty) || 1, urgent, amount: amount ? tl(Number(amount.replace(/\./g, "").replace(",", "."))) : 0, data });
            router.replace(`/job/${job.id}`);
          } catch (e) { Alert.alert("Eksik bilgi", e instanceof FlowError ? e.message : String(e)); }
        }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
