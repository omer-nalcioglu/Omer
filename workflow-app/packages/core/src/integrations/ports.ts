import type { Kurus } from "../money.ts";

/**
 * Entegrasyon portları. Uygulama yalnızca bu arayüzleri tanır; her sağlayıcı (Paraşüt, Logo,
 * Uyumsoft, Meta WhatsApp, Netgsm, iyzico…) bir adaptördür ve sunucuda (Supabase Edge Functions)
 * çalışır. Gizli anahtarlar hiçbir zaman telefona inmez. Yeni sağlayıcı = yeni adaptör + kayıt.
 */
export interface ProviderInfo {
  id: string;            // "parasut", "whatsapp_cloud", "netgsm", "iyzico", "mock"
  kind: "invoice" | "message" | "payment" | "accounting";
  name: string;
  /** Kurulum formunda sorulacak alanlar (gizli olanlar sunucu kasasında saklanır). */
  settings: { key: string; label: string; secret?: boolean; required?: boolean }[];
}

export interface Ok<T> { ok: true; value: T }
export interface Fail { ok: false; error: { code: string; message: string; retryable: boolean } }
export type Outcome<T> = Ok<T> | Fail;

// ---------------------------------------------------------------- e-Fatura / e-Arşiv
/** UBL-TR ile uyumlu, sağlayıcıdan bağımsız fatura modeli. */
export interface InvoiceParty {
  name: string;
  taxNumber?: string;      // VKN (10) ya da TCKN (11)
  taxOffice?: string;
  address?: string;
  city?: string;
  district?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceLine {
  name: string;
  code?: string;
  qty: number;
  unit: string;           // "C62" (adet), "MTR", "KGM" … UBL birim kodu
  unitPrice: Kurus;
  vatRate: number;        // 0, 1, 10, 20
  discountPercent?: number;
  withholdingCode?: string; // tevkifat
}

export interface InvoiceDraft {
  businessId: string;
  jobId?: string;
  /** e-Fatura mükellefi alıcıya TEMEL/TICARI, değilse EARSIV. Sağlayıcı alıcının durumunu sorgular. */
  scenario: "TEMEL" | "TICARI" | "EARSIV" | "AUTO";
  type: "SATIS" | "IADE" | "TEVKIFAT" | "ISTISNA";
  issueDate: string;      // YYYY-MM-DD
  currency: "TRY" | "USD" | "EUR";
  buyer: InvoiceParty;
  lines: InvoiceLine[];
  note?: string;
  idempotencyKey: string;
}

export interface IssuedInvoice {
  providerId: string;
  providerRef: string;    // sağlayıcıdaki kayıt
  number?: string;        // GİB fatura no (ABC2026000000001)
  uuid?: string;          // ETTN
  status: "draft" | "queued" | "sent" | "accepted" | "rejected" | "cancelled";
  pdfUrl?: string;
}

export interface InvoiceProvider {
  info: ProviderInfo;
  /** Alıcı e-Fatura mükellefi mi (senaryo seçimi için). */
  isEInvoiceUser(taxNumber: string): Promise<Outcome<boolean>>;
  issue(draft: InvoiceDraft): Promise<Outcome<IssuedInvoice>>;
  status(providerRef: string): Promise<Outcome<IssuedInvoice>>;
  cancel(providerRef: string, reason: string): Promise<Outcome<IssuedInvoice>>;
}

// ---------------------------------------------------------------- mesajlaşma
export type Channel = "whatsapp" | "sms" | "push" | "email";

export interface OutboundMessage {
  businessId: string;
  channel: Channel;
  to: string;               // telefon (E.164), push token ya da e-posta
  /** WhatsApp işletme hesabında onaylı şablon adı; serbest metin yalnızca 24 saatlik pencerede. */
  template?: string;
  params?: string[];
  text?: string;
  language?: "tr" | "en";
  jobId?: string;
  idempotencyKey: string;
}

export interface SentMessage { providerId: string; providerRef: string; status: "queued" | "sent" | "delivered" | "read" | "failed" }

export interface InboundMessage {
  providerId: string;
  channel: Channel;
  from: string;
  text?: string;
  mediaUrl?: string;
  receivedAt: number;
  providerRef: string;
}

export interface MessagingChannel {
  info: ProviderInfo;
  channel: Channel;
  send(msg: OutboundMessage): Promise<Outcome<SentMessage>>;
  /** Gelen webhook isteğini doğrular ve iç modele çevirir; doğrulama başarısızsa null. */
  parseInbound?(headers: Record<string, string>, rawBody: string): Promise<InboundMessage[] | null>;
}

// ---------------------------------------------------------------- tahsilat
export interface PaymentRequest {
  businessId: string;
  jobId?: string;
  amount: Kurus;
  currency: "TRY";
  description: string;
  buyer: { name: string; email?: string; phone?: string };
  idempotencyKey: string;
}

export interface PaymentLink { providerId: string; providerRef: string; url: string; expiresAt?: number }

export interface PaymentProvider {
  info: ProviderInfo;
  createLink(req: PaymentRequest): Promise<Outcome<PaymentLink>>;
  parseWebhook?(headers: Record<string, string>, rawBody: string): Promise<{ providerRef: string; status: "paid" | "failed" | "refunded"; amount: Kurus } | null>;
}

// ---------------------------------------------------------------- kayıt defteri
export interface Registry {
  invoice: Record<string, InvoiceProvider>;
  message: Record<string, MessagingChannel>;
  payment: Record<string, PaymentProvider>;
}

export const emptyRegistry = (): Registry => ({ invoice: {}, message: {}, payment: {} });
