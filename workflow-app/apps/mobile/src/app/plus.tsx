import { router } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import { Alert, View } from "react-native";

import { can } from "@/data/store";
import { Card, Icon, Rise, Row, T } from "@/ui/kit";
import { radius, space, type, usePalette } from "@/theme/tokens";

export default function Plus() {
  const p = usePalette();
  const soon = (what: string) => () => Alert.alert(what, "Bu form bir sonraki derlemede geliyor.");
  const items: [string, string, SFSymbol, () => void, boolean][] = [
    ["Görev ver", "Kime, ne, ne zamana · alt adımlar", "bolt", () => router.replace("/new-task"), can("create")],
    ["İş emri", "Akış seç, müşteri, termin, özel alanlar", "list.bullet.rectangle", () => router.replace("/new-job"), can("create")],
    ["Teklif", "Katalogdan fiyatlı teklif", "doc.text", soon("Teklif"), can("money")],
    ["Müşteri", "İletişim, adres, vergi bilgisi", "person.crop.circle.badge.plus", soon("Müşteri"), can("create")],
    ["Çalışan davet et", "Telefonuna davet linki gider", "person.2", soon("Davet"), can("team")],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: p.surface, padding: space.lg, paddingTop: space.xl, gap: space.lg }}>
      <T style={type.h3} accessibilityRole="header">Ne oluşturalım?</T>
      <Card style={{ borderRadius: radius.lg }}>
        {items.filter(x => x[4]).map(([t, s, ic, go], i) => (
          <Rise key={t} delay={40 * i}><Row first={i === 0} title={t} sub={s} onPress={go}
            left={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={19} color={p.accent} /></View>} /></Rise>
        ))}
      </Card>
    </View>
  );
}
