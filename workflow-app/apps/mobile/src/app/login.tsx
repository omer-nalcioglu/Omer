import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, View } from "react-native";

import { actions } from "@/data/store";
import { cloudConfigured } from "@/data/remote";
import { Button, Field, Icon, Rise, Screen, T } from "@/ui/kit";
import { font, radius, space, type, usePalette } from "@/theme/tokens";

export default function Login() {
  const p = usePalette();
  const [email, setEmail] = useState("");
  const cloud = cloudConfigured();
  const later = () => Alert.alert("Yakında", "Hesapla giriş, sunucu bağlandığında açılacak. Şimdilik örnek işletmeyle tüm akışları deneyebilirsin.");
  return (
    <Screen padBottom={48}>
      <Rise style={{ gap: space.lg, paddingTop: 56 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: p.accent, alignItems: "center", justifyContent: "center", shadowColor: p.accent, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }}>
          <Icon name="square.stack.3d.up.fill" size={30} color="#fff" />
        </View>
        <T style={[type.title, { fontSize: 40, lineHeight: 46 }]}>Workflow</T>
        <T style={[type.body, { color: p.ink2, fontSize: 17, lineHeight: 25 }]}>İş kimde, hangi aşamada, ne zaman biter? Ekibine görev ver; biri işini bitirince iş kendiliğinden sıradakine geçsin.</T>
      </Rise>
      <Rise delay={120} style={{ gap: space.md }}>
        {Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={radius.md}
            buttonStyle={p.bg === "#0f1117" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            style={{ height: 52 }} onPress={cloud ? later : later} />
        ) : null}
        <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ad@isletme.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Button label="E-postama kod gönder" kind="line" onPress={later} disabled={!/.+@.+\..+/.test(email)} />
      </Rise>
      <Rise delay={220} style={{ gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.sm }}>
          <View style={{ flex: 1, height: 1, backgroundColor: p.line }} /><T style={[type.small, { color: p.ink2 }]}>ya da</T><View style={{ flex: 1, height: 1, backgroundColor: p.line }} />
        </View>
        <Button label="Örnek işletmeyi gez" big onPress={() => { actions.startDemo(); router.replace("/(tabs)"); }} />
        <T style={[type.small, { color: p.ink2, textAlign: "center", fontFamily: font.medium }]}>10 kişilik bir metal atölyesi. Daha fazla menüsünden patron, usta ya da şoför gözüyle bakabilirsin.</T>
      </Rise>
    </Screen>
  );
}
