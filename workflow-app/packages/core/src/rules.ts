import type { DomainEvent } from "./events.ts";
import type { Job } from "./types.ts";

/**
 * Kurallar veri olarak saklanır: "EĞER … İSE … YAP". Motor yalnızca kendi işlerini değiştiren
 * eylemleri uygular (alan doldur, termin kaydır, aşama atla); geri kalan her eylem bir olay
 * üretir ve entegrasyon katmanı tarafından yürütülür. Yeni bir eylem türü = yeni bir olay aboneliği.
 */
export type Trigger = "job.created" | "stage.completed" | "stage.overdue" | "stage.blocked";

export interface Condition {
  /** "amount" | "qty" | "urgent" | "data.<alan>" */
  field: string;
  op: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains" | "isTrue" | "isFalse";
  value?: string | number | boolean;
}

export type Action =
  | { type: "set_field"; key: string; value: string | number | boolean }
  | { type: "shift_due"; hours: number }
  | { type: "skip_stage"; stageKey: string }
  | { type: "mark_urgent" }
  | { type: "notify"; to: string; text: string }
  | { type: "send_message"; to: "customer" | string; template: string }
  | { type: "create_task"; title: string; assignee: string };

export interface Rule {
  id: string;
  on: Trigger;
  stageKey?: string;
  when: Condition[];
  then: Action[];
  enabled: boolean;
}

function read(job: Job, field: string): unknown {
  if (field === "amount") return job.amount;
  if (field === "qty") return job.qty;
  if (field === "urgent") return job.urgent;
  if (field.startsWith("data.")) return job.data[field.slice(5)];
  return undefined;
}

export function matches(job: Job, c: Condition): boolean {
  const v = read(job, c.field);
  switch (c.op) {
    case "isTrue": return v === true;
    case "isFalse": return v === false || v === undefined || v === null;
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "contains": return typeof v === "string" && typeof c.value === "string" && v.toLocaleLowerCase("tr").includes(c.value.toLocaleLowerCase("tr"));
    default: {
      if (typeof v !== "number" || typeof c.value !== "number") return false;
      return c.op === "gt" ? v > c.value : c.op === "gte" ? v >= c.value : c.op === "lt" ? v < c.value : v <= c.value;
    }
  }
}

export function rulesFor(rules: Rule[], on: Trigger, job: Job, stageKey?: string): Action[] {
  return rules
    .filter(r => r.enabled && r.on === on && (!r.stageKey || r.stageKey === stageKey) && r.when.every(c => matches(job, c)))
    .flatMap(r => r.then);
}

/** Motorun kendisinin uygulamadığı eylemleri olaya çevirir. */
export function actionEvents(job: Job, actions: Action[], at: number): DomainEvent[] {
  const out: DomainEvent[] = [];
  for (const a of actions) {
    if (a.type === "notify") out.push({ type: "notify", jobId: job.id, to: a.to, text: a.text, at });
    if (a.type === "send_message") out.push({ type: "message.requested", jobId: job.id, to: a.to, template: a.template, at });
    if (a.type === "create_task") out.push({ type: "task.requested", jobId: job.id, title: a.title, assignee: a.assignee, at });
  }
  return out;
}
