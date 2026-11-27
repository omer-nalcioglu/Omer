import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";

import { dayLabel, hm } from "@/data/format";
import { actions, useApp, visibleNotice } from "@/data/store";
import { Card, Empty, Row } from "@/ui/kit";
import { space, usePalette } from "@/theme/tokens";

export default function Notices() {
  const p = usePalette(), me = useApp(s => s.me);
  const list = useApp(s => s.notices).filter(visibleNotice);
  useEffect(() => () => actions.markRead(), [me]);
  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      {list.length ? <Card>{list.slice(0, 50).map((n, i) => (
        <Row key={n.id} first={i === 0} title={n.text} sub={`${dayLabel(n.at)} ${hm(n.at)}`}
          left={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: n.read ? p.line2 : p.accent }} />}
          onPress={n.jobId ? () => { router.back(); router.push(`/job/${n.jobId}`); } : undefined} />
      ))}</Card> : <Empty text="Bildirim yok. Sana bir iş düştüğünde ya da bir işte sorun çıktığında burada görünür." />}
    </ScrollView>
  );
}
