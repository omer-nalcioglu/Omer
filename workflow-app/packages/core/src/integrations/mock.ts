import type { InvoiceProvider, MessagingChannel, PaymentProvider } from "./ports.ts";

/** Deneme sağlayıcıları: gerçek hesap bağlanana kadar akışlar uçtan uca çalışsın diye. */
export const mockInvoice: InvoiceProvider = {
  info: { id: "mock", kind: "invoice", name: "Deneme faturası", settings: [] },
  async isEInvoiceUser(taxNumber) { return { ok: true, value: taxNumber.length === 10 }; },
  async issue(d) {
    return { ok: true, value: { providerId: "mock", providerRef: `mock-${d.idempotencyKey}`, number: `TST${new Date().getFullYear()}${String(Date.now()).slice(-9)}`, status: "accepted" } };
  },
  async status(ref) { return { ok: true, value: { providerId: "mock", providerRef: ref, status: "accepted" } }; },
  async cancel(ref) { return { ok: true, value: { providerId: "mock", providerRef: ref, status: "cancelled" } }; },
};

export const mockMessage: MessagingChannel = {
  info: { id: "mock", kind: "message", name: "Deneme mesajı", settings: [] },
  channel: "whatsapp",
  async send(m) { return { ok: true, value: { providerId: "mock", providerRef: `mock-${m.idempotencyKey}`, status: "sent" } }; },
};

export const mockPayment: PaymentProvider = {
  info: { id: "mock", kind: "payment", name: "Deneme ödemesi", settings: [] },
  async createLink(r) { return { ok: true, value: { providerId: "mock", providerRef: `mock-${r.idempotencyKey}`, url: `https://example.invalid/pay/${r.idempotencyKey}` } }; },
};
