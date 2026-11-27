/**
 * Alan olayları. Motor bir şey değiştirdiğinde olay üretir; olaylar veritabanında aynı işlemde
 * `outbox` tablosuna yazılır ve bildirim, WhatsApp, e-Fatura gibi her entegrasyon olaylara abone olur.
 * Böylece yeni bir entegrasyon eklemek motoru değiştirmez: yeni bir abone yazılır.
 */
export type DomainEvent =
  | { type: "job.created"; jobId: string; at: number }
  | { type: "stage.ready"; jobId: string; stageKey: string; owner: string | null; at: number }
  | { type: "stage.started"; jobId: string; stageKey: string; by: string; at: number }
  | { type: "stage.completed"; jobId: string; stageKey: string; by: string; choice?: string; at: number }
  | { type: "stage.blocked"; jobId: string; stageKey: string; by: string; issue: string; at: number }
  | { type: "stage.sent_back"; jobId: string; from: string; to: string; by: string; note: string; at: number }
  | { type: "timer.scheduled"; jobId: string; stageKey: string; fireAt: number; at: number }
  | { type: "invoice.requested"; jobId: string; stageKey: string; at: number }
  | { type: "payment.requested"; jobId: string; stageKey: string; at: number }
  | { type: "subjob.requested"; jobId: string; stageKey: string; flowId: string; at: number }
  | { type: "message.requested"; jobId: string; stageKey?: string; to: string; template: string; at: number }
  | { type: "notify"; jobId: string; to: string; text: string; at: number }
  | { type: "task.requested"; jobId: string; title: string; assignee: string; at: number }
  | { type: "job.completed"; jobId: string; at: number }
  | { type: "job.cancelled"; jobId: string; reason: string; at: number }
  | { type: "job.held"; jobId: string; reason: string; at: number }
  | { type: "job.resumed"; jobId: string; at: number };

export type EventType = DomainEvent["type"];

/** Outbox satırı: veritabanındaki `outbox` tablosunun alanlarıyla birebir. */
export interface OutboxEnvelope {
  id: string;
  businessId: string;
  type: EventType;
  payload: DomainEvent;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: "pending" | "delivered" | "failed" | "dead";
}

export const idempotencyKeyOf = (e: DomainEvent) =>
  [e.type, e.jobId, "stageKey" in e ? e.stageKey : "", e.at].join(":");
