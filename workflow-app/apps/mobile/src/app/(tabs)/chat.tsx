import { router } from "expo-router";

import { hm, dayLabel } from "@/data/format";
import { firstName, useApp } from "@/data/store";
import { Card, Empty, Header, Icon, Rise, Row, Screen, Section, T } from "@/ui/kit";
import { radius, type, usePalette } from "@/theme/tokens";
import { View } from "react-native";

/** Sohbet: her işin kendi kanalı. Bu sürümde işin olay günlüğü gösterilir; mesajlaşma sunucu bağlanınca açılır. */
export default function Chat() {
  const p = usePalette(), jobs = useApp(s => s.jobs);
  const threads = jobs.filter(j => j.status !== "cancelled").map(j => ({ j, last: j.log.at(-1)! })).sort((a, b) => b.last.at - a.last.at);
  return (
    <Screen>
      <Header eyebrow="İşe özel kanallar" title="Sohbet" />
      <Rise delay={60}>
        <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: p.accentSoft, borderWidth: 1, borderColor: p.accentLine }}>
          <Icon name="info.circle" color={p.accent} />
          <T style={[type.small, { flex: 1 }]}>Mesajlaşma ve WhatsApp köprüsü sunucu bağlandığında açılacak. Şimdilik her işin hareketleri burada akıyor.</T>
        </View>
      </Rise>
      <Rise delay={100}>
        <Section title="İşler">
          {threads.length ? <Card>{threads.map(({ j, last }, i) => (
            <Row key={j.id} first={i === 0} title={`#${j.number} ${j.title}`} sub={`${firstName(last.by)}: ${last.text} · ${dayLabel(last.at)} ${hm(last.at)}`}
              left={<View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}><T style={{ color: p.accent2, fontWeight: "800" }}>#</T></View>}
              onPress={() => router.push(`/job/${j.id}`)} />
          ))}</Card> : <Empty text="Henüz iş yok." />}
        </Section>
      </Rise>
    </Screen>
  );
}
