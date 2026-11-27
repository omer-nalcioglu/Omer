import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { actions, firstName, useApp } from "@/data/store";
import { Button, Chip, Chips, Field, T } from "@/ui/kit";
import { font, space, type, usePalette } from "@/theme/tokens";

const endOfDay = (addDays: number) => { const d = new Date(); d.setDate(d.getDate() + addDays); d.setHours(17, 0, 0, 0); return d.getTime(); };
const WHEN = [["Bugün", 0], ["Yarın", 1], ["Bu hafta", Math.max(1, 5 - new Date().getDay())]] as const;

export default function NewTask() {
  const p = usePalette(), people = useApp(s => s.people), me = useApp(s => s.me);
  const [title, setTitle] = useState(""), [who, setWho] = useState<string[]>([]), [when, setWhen] = useState(0), [note, setNote] = useState(""), [steps, setSteps] = useState("");
  const ok = title.trim().length > 1 && who.length > 0;
  const toggle = (id: string) => setWho(w => (w.includes(id) ? w.filter(x => x !== id) : [...w, id]));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <T style={[type.small, { color: p.ink2 }]}>Kişiye bildirim gider; başladığını ve bitirdiğini görürsün.</T>
        <Field label="Ne yapılacak" value={title} onChangeText={setTitle} placeholder="Ör: Kaya İnşaat'a numune götür" autoFocus />
        <View style={{ gap: 8 }}>
          <T style={[type.small, { fontFamily: font.bold }]}>Kime <T style={[type.small, { color: p.ink2 }]}>· birden fazla seçebilirsin</T></T>
          <Chips>{people.map(x => <Chip key={x.id} label={x.id === me ? `${firstName(x.id)} (sen)` : firstName(x.id)} on={who.includes(x.id)} onPress={() => toggle(x.id)} />)}</Chips>
          {who.length > 1 ? <T style={[type.small, { color: p.ink2 }]}>{who.length} kişi seçildi · her biri kendi görevini alır</T> : null}
        </View>
        <View style={{ gap: 8 }}>
          <T style={[type.small, { fontFamily: font.bold }]}>Ne zamana</T>
          <Chips>{WHEN.map(([l, d], i) => <Chip key={l} label={l} on={when === i} onPress={() => setWhen(i)} />)}</Chips>
        </View>
        <Field label="Alt adımlar · her satıra bir adım" value={steps} onChangeText={setSteps} multiline placeholder={"Numuneyi paketle\nİrsaliyeyi imzalat"} />
        <Field label="Not" value={note} onChangeText={setNote} multiline placeholder="Adres, ölçü, ayrıntı…" />
        <Button big kind="ok" disabled={!ok} label={!title.trim() ? "Ne yapılacağını yaz" : !who.length ? "Kime vereceğini seç" : who.length > 1 ? `${who.length} kişiye görev ver` : "Görevi ver"}
          onPress={() => {
            actions.giveTask({ title: title.trim(), who, due: endOfDay(WHEN[when]![1]), note: note.trim() || undefined, steps: steps.split("\n").map(s => s.trim()).filter(Boolean) });
            router.back();
            setTimeout(() => Alert.alert("Görev verildi", `${who.map(firstName).join(", ")} · ${WHEN[when]![0]}`), 300);
          }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
