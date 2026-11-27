// Sözleşmesi ve test hesabı henüz olmayan sağlayıcılar. Arayüz sabit; içerik, sağlayıcının güncel API
// belgeleri ve test hesabıyla doldurulacak. Seçilirlerse açık bir hata döner, hiçbir şey sessizce kaybolmaz.
import type { InvoiceProvider, MessagingChannel, PaymentProvider, Outcome } from "../core.ts";

const notReady = <T>(provider: string): Promise<Outcome<T>> =>
  Promise.resolve({ ok: false, error: { code: "provider_not_implemented", message: `${provider} adaptörü henüz bağlanmadı`, retryable: false } });

const invoiceStub = (id: string, name: string): InvoiceProvider => ({
  info: { id, kind: "invoice", name, settings: [] },
  isEInvoiceUser: () => notReady(id), issue: () => notReady(id), status: () => notReady(id), cancel: () => notReady(id),
});

export const PENDING_INVOICE = {
  parasut: invoiceStub("parasut", "Paraşüt"),
  logo_isbasi: invoiceStub("logo_isbasi", "Logo İşbaşı"),
  uyumsoft: invoiceStub("uyumsoft", "Uyumsoft"),
};
export const PENDING_SMS: MessagingChannel = { info: { id: "netgsm", kind: "message", name: "Netgsm SMS", settings: [] }, channel: "sms", send: () => notReady("netgsm") };
export const PENDING_PAYMENT: PaymentProvider = { info: { id: "iyzico", kind: "payment", name: "iyzico", settings: [] }, createLink: () => notReady("iyzico") };
