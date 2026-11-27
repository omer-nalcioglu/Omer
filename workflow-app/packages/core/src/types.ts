import type { FieldDef, JobData } from "./fields.ts";
import type { Kurus } from "./money.ts";
import type { Rule } from "./rules.ts";

/**
 * Akış bir grafiktir: her aşama bir düğüm, `next` ve karar dalları kenarlar.
 * Paralel çalışma = bir aşamadan birden çok hedefe çıkmak; birleşme = hedefin `join` kuralı.
 * Yeni aşama türleri motoru değiştirmeden eklenir: motor yalnızca türün davranış bayraklarına bakar.
 */
export type StageKind =
  | "task"         // birinin yapacağı iş
  | "approval"     // onay / kalite kontrol
  | "decision"     // koşullu dal: "Ölçü uygun mu?"
  | "wait"         // dışarıyı bekle (tedarikçi, müşteri)
  | "timer"        // süre bekle (boya kuruması): kendiliğinden biter
  | "appointment"  // randevu / keşif: tarih, saat, adres
  | "pack"         // sevkiyat hazırlığı (barkod)
  | "delivery"     // teslimat (imza, fotoğraf)
  | "invoice"      // fatura: kayıt ya da e-Fatura sağlayıcısına gider
  | "payment"      // tahsilat: ödeme linki / hatırlatma
  | "subjob"       // alt iş: başka bir akışı başlatır, o bitince devam eder
  | "notify";      // otomatik adım: mesaj gönderir ve geçer

export interface Assignment {
  mode: "dept" | "person" | "pool" | "creator" | "previous";
  dept?: string;
  person?: string;
  crew?: "solo" | "together" | "split";
}

export interface Branch {
  id: string;
  label: string;
  to: string;
}

export interface StageDef {
  key: string;
  name: string;
  kind: StageKind;
  assign: Assignment;
  next: string[];
  join?: "all" | "any";
  branches?: Branch[];
  slaMinutes?: number;
  perUnitMinutes?: number;
  checklist?: string[];
  photoRequired?: boolean;
  signatureRequired?: boolean;
  publicName?: string;
  hiddenFromCustomer?: boolean;
  timerMinutes?: number;
  subflowId?: string;
  messageTemplate?: string;
}

export interface FlowPrefs {
  notifyCustomer: boolean;
  customerCanSee: boolean;
  allowSendBack: boolean;
}

export interface FlowDef {
  id: string;
  version: number;
  name: string;
  icon: string;
  stages: StageDef[];
  start?: string[];
  fields: FieldDef[];
  rules: Rule[];
  prefs: FlowPrefs;
  hidden?: boolean;
}

export type StageStatus = "locked" | "ready" | "working" | "blocked" | "done" | "skipped";

export interface StageRun {
  key: string;
  status: StageStatus;
  owner: string | null;
  crew: string[];
  readyAt?: number;
  startedAt?: number;
  doneAt?: number;
  dueAt?: number;
  checks: boolean[];
  choice?: string;
  issue?: { type: string; note: string; at: number; by: string };
  visits: number;
  photos: number;
}

export type JobStatus = "open" | "on_hold" | "done" | "cancelled";

export interface LogEntry { at: number; by: string; text: string; stageKey?: string }

export interface Job {
  id: string;
  businessId: string;
  flowId: string;
  flowVersion: number;
  number: number;
  title: string;
  customerId: string | null;
  customerName: string;
  qty: number;
  unit: string;
  due: number;
  createdAt: number;
  createdBy: string;
  urgent: boolean;
  status: JobStatus;
  data: JobData;
  stages: Record<string, StageRun>;
  parentJobId: string | null;
  amount: Kurus;
  log: LogEntry[];
}

export interface Person {
  id: string;
  name: string;
  title: string;
  group: string;
  depts: string[];
  phone?: string;
}

export type Permission = "seeAll" | "create" | "assign" | "approve" | "money" | "flows" | "team" | "reports";

export interface PermissionGroup {
  key: string;
  name: string;
  home: "boss" | "foreman" | "worker" | "driver";
  perms: Permission[];
  locked?: boolean;
}
