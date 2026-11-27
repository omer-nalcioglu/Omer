import * as Application from "expo-application";
import { router } from "expo-router";
import { Alert, View } from "react-native";

import { actions, can, groupOf, homeOf, useApp } from "@/data/store";
import { Avatar, Button, Card, Header, Icon, Pill, Rise, Row, Screen, Section, T } from "@/ui/kit";
import { space, type, usePalette } from "@/theme/tokens";

const INTEGRATIONS = [
  { name: "e-Fatura / e-Arşiv", sub: "Paraşüt, Logo İşbaşı, Uyumsoft", icon: "doc.text" as const },
  { name: "WhatsApp Business", sub: "Müşteriye aşama bildirimi, gelen mesajlar sohbete", icon: "message" as const },
  { name: "SMS", sub: "Netgsm ve benzeri", icon: "text.bubble" as const },
  { name: "Online tahsilat", sub: "Ödeme linki (iyzico ve benzeri)", icon: "creditcard" as const },
];

export default function More() {
  const p = usePalette(), me = useApp(s => s.me), people = useApp(s => s.people), flows = useApp(s => s.flows), mode = useApp(s => s.mode);
  const self = people.find(x => x.id === me);
  const version = `${Application.nativeApplicationVersion ?? "1.0.0"} (${Application.nativeBuildVersion ?? "1"})`;
  return (
    <Screen>
      <Header eyebrow={useApp(s => s.businessName)} title="Daha fazla" />
      {self ? (
        <Rise delay={50}><Card style={{ padding: space.lg, flexDirection: "row", gap: space.md, alignItems: "center" }}>
          <Avatar name={self.name} size={48} />
          <View style={{ flex: 1 }}><T style={type.bodyStrong}>{self.name}</T><T style={[type.small, { color: p.ink2 }]}>{groupOf(me).name} · {self.title}</T></View>
        </Card></Rise>
      ) : null}
      {mode === "demo" ? (
        <Rise delay={90}><Section title="Kimin gözüyle bak">
          <T style={[type.small, { color: p.ink2 }]}>Örnek işletmede herkesin ekranını deneyebilirsin. Gerçek hesapta bu bölüm görünmez.</T>
          <Card>{people.map((x, i) => (
            <Row key={x.id} first={i === 0} title={x.name} sub={`${groupOf(x.id).name} · ${x.title}`} left={<Avatar name={x.name} />}
              right={x.id === me ? <Pill label="Şu an" tone="accent" /> : undefined} onPress={() => { actions.switchUser(x.id); router.navigate("/(tabs)"); }} />
          ))}</Card>
        </Section></Rise>
      ) : null}
      {can("flows") ? (
        <Rise delay={130}><Section title="İş akışları">
          <Card>{Object.values(flows).filter(f => !f.hidden).map((f, i) => (
            <Row key={f.id} first={i === 0} title={f.name} sub={`${f.stages.length} aşama · ${f.fields.length} özel alan · sürüm ${f.version}`} left={<Icon name="point.3.connected.trianglepath.dotted" color={p.accent} />} />
          ))}</Card>
          <T style={[type.small, { color: p.ink2 }]}>Akış tasarlayıcısı (dal, alt iş, özel alan, deneme işi) Faz 1'de bu ekrana gelecek.</T>
        </Section></Rise>
      ) : null}
      {homeOf(me) === "boss" ? (
        <Rise delay={170}><Section title="Entegrasyonlar">
          <Card>{INTEGRATIONS.map((x, i) => <Row key={x.name} first={i === 0} title={x.name} sub={x.sub} left={<Icon name={x.icon} color={p.accent} />} right={<Pill label="Bağlı değil" />} onPress={() => Alert.alert(x.name, "Bağlantı ekranı sunucu kurulunca açılacak. Altyapı hazır: sağlayıcı seçilir, anahtar sunucu kasasına kaydedilir, olaylar otomatik gider.")} />)}</Card>
        </Section></Rise>
      ) : null}
      <Rise delay={210} style={{ gap: space.sm }}>
        <Button kind="line" label={mode === "demo" ? "Örnek işletmeden çık" : "Çıkış yap"} onPress={() => Alert.alert("Çıkılsın mı?", mode === "demo" ? "Örnek işletmedeki değişiklikler silinir." : undefined, [{ text: "Vazgeç", style: "cancel" }, { text: "Çık", style: "destructive", onPress: () => { actions.signOut(); router.replace("/login"); } }])} />
        <T style={[type.small, { color: p.ink3, textAlign: "center" }]}>Workflow {version}</T>
      </Rise>
    </Screen>
  );
}
