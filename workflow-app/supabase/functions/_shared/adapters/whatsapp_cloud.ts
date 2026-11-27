// WhatsApp Business Cloud API adaptörü (Meta). Yapılandırma: phone_number_id, graph_version (config),
// access_token ve app_secret (Vault). Müşteriye ilk mesaj yalnızca onaylı şablonla gider; serbest metin
// müşteri son 24 saatte yazdıysa gönderilir. Müşterinin açık rızası (customers.whatsapp_opt_in) şarttır.
import type { InboundMessage, MessagingChannel, OutboundMessage, Outcome, SentMessage } from "../core.ts";

export interface WhatsAppConfig { phoneNumberId: string; graphVersion: string; accessToken: string; appSecret: string }

export function whatsappCloud(cfg: WhatsAppConfig): MessagingChannel {
  return {
    info: { id: "whatsapp_cloud", kind: "message", name: "WhatsApp Business", settings: [
      { key: "phoneNumberId", label: "Telefon numarası kimliği", required: true },
      { key: "graphVersion", label: "Graph API sürümü", required: true },
      { key: "accessToken", label: "Erişim anahtarı", secret: true, required: true },
      { key: "appSecret", label: "Uygulama gizli anahtarı", secret: true, required: true },
    ] },
    channel: "whatsapp",
    async send(m: OutboundMessage): Promise<Outcome<SentMessage>> {
      const body = m.template
        ? { messaging_product: "whatsapp", to: m.to.replace(/^\+/, ""), type: "template",
            template: { name: m.template, language: { code: m.language ?? "tr" },
              components: m.params?.length ? [{ type: "body", parameters: m.params.map(text => ({ type: "text", text })) }] : [] } }
        : { messaging_product: "whatsapp", to: m.to.replace(/^\+/, ""), type: "text", text: { body: m.text ?? "" } };
      const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: { code: `http_${res.status}`, message: JSON.stringify(json).slice(0, 300), retryable: res.status >= 500 || res.status === 429 } };
      return { ok: true, value: { providerId: "whatsapp_cloud", providerRef: json?.messages?.[0]?.id ?? "", status: "sent" } };
    },
    async parseInbound(headers, raw): Promise<InboundMessage[] | null> {
      const sig = headers["x-hub-signature-256"] ?? "";
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(cfg.appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
      const hex = "sha256=" + Array.from(mac, b => b.toString(16).padStart(2, "0")).join("");
      if (hex !== sig) return null;
      const out: InboundMessage[] = [];
      const data = JSON.parse(raw);
      for (const entry of data.entry ?? []) for (const ch of entry.changes ?? []) for (const msg of ch.value?.messages ?? []) {
        out.push({ providerId: "whatsapp_cloud", channel: "whatsapp", from: "+" + msg.from, text: msg.text?.body, receivedAt: Number(msg.timestamp) * 1000, providerRef: msg.id });
      }
      return out;
    },
  };
}
