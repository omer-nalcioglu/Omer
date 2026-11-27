// Sağlayıcı kayıt defteri: işletmenin `integrations` satırından ve Vault'taki anahtarlardan adaptör kurar.
import { mockInvoice, mockMessage, mockPayment, type InvoiceProvider, type MessagingChannel, type PaymentProvider } from "./core.ts";
import { whatsappCloud } from "./adapters/whatsapp_cloud.ts";
import { PENDING_INVOICE, PENDING_PAYMENT, PENDING_SMS } from "./adapters/pending.ts";

export interface IntegrationRow { id: string; kind: string; provider: string; config: Record<string, string>; secrets: Record<string, string> }

export function messageAdapter(row: IntegrationRow): MessagingChannel {
  switch (row.provider) {
    case "whatsapp_cloud": return whatsappCloud({ phoneNumberId: row.config.phoneNumberId, graphVersion: row.config.graphVersion, accessToken: row.secrets.accessToken, appSecret: row.secrets.appSecret });
    case "netgsm": return PENDING_SMS;
    default: return mockMessage;
  }
}

export function invoiceAdapter(row: IntegrationRow): InvoiceProvider {
  return (PENDING_INVOICE as Record<string, InvoiceProvider>)[row.provider] ?? mockInvoice;
}

export function paymentAdapter(row: IntegrationRow): PaymentProvider {
  return row.provider === "iyzico" ? PENDING_PAYMENT : mockPayment;
}
