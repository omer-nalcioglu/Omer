import type { DomainEvent } from "./events.ts";
import { validateFields, type JobData } from "./fields.ts";
import { actionEvents, rulesFor, type Action } from "./rules.ts";
import type { FlowDef, Job, StageDef, StageRun } from "./types.ts";

/**
 * İş akışı motoru: saf fonksiyonlar. Girdi iş + akış, çıktı yeni iş + olaylar.
 * Hiçbir yan etkisi yok; aynı kod telefonda (çevrimdışı) ve sunucuda (doğrulama) çalışır.
 */
export interface Result { job: Job; events: DomainEvent[] }

export class FlowError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export interface OwnerResolver {
  (stage: StageDef, job: Job): { owner: string | null; crew: string[] };
}

export const defaultResolver: OwnerResolver = (st, job) => {
  if (st.assign.mode === "person" && st.assign.person) return { owner: st.assign.person, crew: [st.assign.person] };
  if (st.assign.mode === "creator") return { owner: job.createdBy, crew: [job.createdBy] };
  return { owner: null, crew: [] };
};

export interface Ctx { now: number; by: string; resolve?: OwnerResolver }

const clone = (j: Job): Job => JSON.parse(JSON.stringify(j)) as Job;
const stageOf = (flow: FlowDef, key: string): StageDef => {
  const s = flow.stages.find(x => x.key === key);
  if (!s) throw new FlowError("stage_unknown", `Aşama yok: ${key}`);
  return s;
};
const targetsOf = (s: StageDef): string[] => s.kind === "decision" ? (s.branches ?? []).map(b => b.to) : s.next;
const incomingOf = (flow: FlowDef, key: string): StageDef[] => flow.stages.filter(s => targetsOf(s).includes(key));
export const startKeys = (flow: FlowDef): string[] =>
  flow.start?.length ? flow.start : flow.stages.filter(s => incomingOf(flow, s.key).length === 0).map(s => s.key);

function reachable(flow: FlowDef, from: string): Set<string> {
  const seen = new Set<string>(), stack = [from];
  while (stack.length) {
    const k = stack.pop()!;
    if (seen.has(k)) continue;
    seen.add(k);
    for (const t of targetsOf(stageOf(flow, k))) stack.push(t);
  }
  return seen;
}

/** Akış tanımını kaydetmeden önce denetler: kopuk kenar, ulaşılamayan aşama, sahipsiz aşama, boş dal. */
export function validateFlow(flow: FlowDef): string[] {
  const errs: string[] = [], keys = new Set(flow.stages.map(s => s.key));
  if (!flow.stages.length) errs.push("Akışta aşama yok");
  for (const s of flow.stages) {
    for (const t of targetsOf(s)) if (!keys.has(t)) errs.push(`${s.name}: bağlı olduğu aşama yok (${t})`);
    if (s.kind === "decision" && (s.branches?.length ?? 0) < 2) errs.push(`${s.name}: karar en az iki dal ister`);
    if (s.assign.mode === "person" && !s.assign.person) errs.push(`${s.name}: kişi seçilmedi`);
    if (s.assign.mode === "dept" && !s.assign.dept) errs.push(`${s.name}: departman seçilmedi`);
  }
  if (errs.length) return errs;
  const seen = new Set<string>();
  for (const k of startKeys(flow)) reachable(flow, k).forEach(x => seen.add(x));
  for (const s of flow.stages) if (!seen.has(s.key)) errs.push(`${s.name}: başlangıçtan bu aşamaya ulaşılamıyor`);
  if (!startKeys(flow).length) errs.push("Akışın başlangıç aşaması yok (her aşama başka bir aşamadan geliyor)");
  return errs;
}

function freshRun(key: string): StageRun {
  return { key, status: "locked", owner: null, crew: [], checks: [], visits: 0, photos: 0 };
}

function activate(job: Job, flow: FlowDef, key: string, ctx: Ctx, ev: DomainEvent[]) {
  const st = stageOf(flow, key), run = job.stages[key]!;
  const who = (ctx.resolve ?? defaultResolver)(st, job);
  if (st.assign.mode === "previous") {
    const prev = incomingOf(flow, key).map(s => job.stages[s.key]).find(r => r?.status === "done" && r.owner);
    if (prev) { who.owner = prev.owner; who.crew = [prev.owner!]; }
  }
  Object.assign(run, { status: "ready", owner: who.owner, crew: who.crew, readyAt: ctx.now, checks: (st.checklist ?? []).map(() => false), visits: run.visits + 1 });
  delete run.startedAt; delete run.doneAt; delete run.choice; delete run.issue;
  if (st.slaMinutes) run.dueAt = ctx.now + st.slaMinutes * 60_000;
  ev.push({ type: "stage.ready", jobId: job.id, stageKey: key, owner: run.owner, at: ctx.now });
  switch (st.kind) {
    case "timer": {
      run.status = "working"; run.startedAt = ctx.now;
      const fireAt = ctx.now + (st.timerMinutes ?? 60) * 60_000; run.dueAt = fireAt;
      ev.push({ type: "timer.scheduled", jobId: job.id, stageKey: key, fireAt, at: ctx.now });
      break;
    }
    case "invoice": ev.push({ type: "invoice.requested", jobId: job.id, stageKey: key, at: ctx.now }); break;
    case "payment": ev.push({ type: "payment.requested", jobId: job.id, stageKey: key, at: ctx.now }); break;
    case "subjob": ev.push({ type: "subjob.requested", jobId: job.id, stageKey: key, flowId: st.subflowId ?? "", at: ctx.now }); break;
    case "notify":
      ev.push({ type: "message.requested", jobId: job.id, stageKey: key, to: "customer", template: st.messageTemplate ?? "stage_update", at: ctx.now });
      finish(job, flow, key, { ...ctx, by: "system" }, ev);
      break;
  }
}

/** Bir aşama bitince sıradakileri açar. Karar dalında seçilmeyen yollar atlanır, geri dönen dal döngüyü yeniden açar. */
function advance(job: Job, flow: FlowDef, from: StageDef, ctx: Ctx, ev: DomainEvent[]) {
  let targets = from.next;
  if (from.kind === "decision") {
    const choice = job.stages[from.key]!.choice;
    const chosen = (from.branches ?? []).find(b => b.id === choice);
    if (!chosen) throw new FlowError("choice_required", `${from.name}: bir seçenek seçilmeli`);
    targets = [chosen.to];
    const keep = reachable(flow, chosen.to);
    for (const b of from.branches ?? []) {
      if (b.id === chosen.id) continue;
      for (const k of reachable(flow, b.to)) {
        if (keep.has(k)) continue;
        const r = job.stages[k]!;
        if (r.status === "locked") r.status = "skipped";
      }
    }
  }
  for (const t of targets) {
    const run = job.stages[t]!;
    if (run.status === "done" || run.status === "skipped") {
      // geri dönen kenar: hedef ve ondan ulaşılan her şey yeniden açılır (döngü)
      for (const k of reachable(flow, t)) job.stages[k] = { ...freshRun(k), visits: job.stages[k]!.visits };
      activate(job, flow, t, ctx, ev);
      continue;
    }
    if (run.status !== "locked") continue;
    const st = stageOf(flow, t);
    const inc = incomingOf(flow, t);
    const ok = (st.join ?? "all") === "any" || inc.every(s => ["done", "skipped"].includes(job.stages[s.key]!.status));
    if (ok) activate(job, flow, t, ctx, ev);
  }
}

function settle(job: Job, ctx: Ctx, ev: DomainEvent[]) {
  const runs = Object.values(job.stages);
  if (runs.some(r => ["ready", "working", "blocked"].includes(r.status))) return;
  for (const r of runs) if (r.status === "locked") r.status = "skipped";
  if (job.status === "open") {
    job.status = "done";
    ev.push({ type: "job.completed", jobId: job.id, at: ctx.now });
  }
}

function applyActions(job: Job, flow: FlowDef, actions: Action[], ctx: Ctx, ev: DomainEvent[]) {
  for (const a of actions) {
    if (a.type === "set_field") job.data[a.key] = a.value;
    if (a.type === "shift_due") job.due += a.hours * 3_600_000;
    if (a.type === "mark_urgent") job.urgent = true;
    if (a.type === "skip_stage") { const r = job.stages[a.stageKey]; if (r && r.status === "locked") r.status = "skipped"; }
  }
  ev.push(...actionEvents(job, actions, ctx.now));
  void flow;
}

function finish(job: Job, flow: FlowDef, key: string, ctx: Ctx, ev: DomainEvent[]) {
  const st = stageOf(flow, key), run = job.stages[key]!;
  run.status = "done"; run.doneAt = ctx.now; run.startedAt ??= run.readyAt ?? ctx.now;
  job.log.push({ at: ctx.now, by: ctx.by, text: `${st.name} bitti${run.choice ? ` · ${st.branches?.find(b => b.id === run.choice)?.label ?? ""}` : ""}`, stageKey: key });
  ev.push({ type: "stage.completed", jobId: job.id, stageKey: key, by: ctx.by, ...(run.choice ? { choice: run.choice } : {}), at: ctx.now });
  applyActions(job, flow, rulesFor(flow.rules, "stage.completed", job, key), ctx, ev);
  advance(job, flow, st, ctx, ev);
  settle(job, ctx, ev);
}

export interface NewJobInput {
  id: string;
  businessId: string;
  number: number;
  title: string;
  customerId?: string | null;
  customerName?: string;
  qty?: number;
  unit?: string;
  due: number;
  urgent?: boolean;
  amount?: number;
  data?: JobData;
  parentJobId?: string | null;
}

export function createJob(flow: FlowDef, input: NewJobInput, ctx: Ctx): Result {
  const errs = validateFields(flow.fields, input.data ?? {}, "create");
  if (errs.length) throw new FlowError("fields", errs.map(e => e.message).join(", "));
  const job: Job = {
    id: input.id, businessId: input.businessId, flowId: flow.id, flowVersion: flow.version, number: input.number,
    title: input.title, customerId: input.customerId ?? null, customerName: input.customerName ?? "", qty: input.qty ?? 1, unit: input.unit ?? "adet",
    due: input.due, createdAt: ctx.now, createdBy: ctx.by, urgent: !!input.urgent, status: "open", data: { ...(input.data ?? {}) },
    stages: Object.fromEntries(flow.stages.map(s => [s.key, freshRun(s.key)])), parentJobId: input.parentJobId ?? null, amount: input.amount ?? 0,
    log: [{ at: ctx.now, by: ctx.by, text: "İş açıldı" }],
  };
  const ev: DomainEvent[] = [{ type: "job.created", jobId: job.id, at: ctx.now }];
  applyActions(job, flow, rulesFor(flow.rules, "job.created", job), ctx, ev);
  for (const k of startKeys(flow)) if (job.stages[k]!.status === "locked") activate(job, flow, k, ctx, ev);
  settle(job, ctx, ev);
  return { job, events: ev };
}

const mustBeOpen = (job: Job) => { if (job.status !== "open") throw new FlowError("job_closed", "İş açık değil"); };

export function startStage(job0: Job, flow: FlowDef, key: string, ctx: Ctx): Result {
  const job = clone(job0); mustBeOpen(job);
  const run = job.stages[key];
  if (!run || run.status !== "ready") throw new FlowError("not_ready", "Bu aşama başlamaya hazır değil");
  run.status = "working"; run.startedAt = ctx.now;
  if (!run.owner) { run.owner = ctx.by; run.crew = [ctx.by]; }
  return { job, events: [{ type: "stage.started", jobId: job.id, stageKey: key, by: ctx.by, at: ctx.now }] };
}

export function toggleCheck(job0: Job, key: string, index: number): Job {
  const job = clone(job0), run = job.stages[key];
  if (run && index >= 0 && index < run.checks.length) run.checks[index] = !run.checks[index];
  return job;
}

export function addPhoto(job0: Job, key: string): Job {
  const job = clone(job0), run = job.stages[key];
  if (run) run.photos += 1;
  return job;
}

/** Bitirmeyi engelleyen şeyler: işaretlenmemiş adım, eksik fotoğraf, bu aşamada zorunlu alan, karar seçimi. */
export function blockers(job: Job, flow: FlowDef, key: string, choice?: string): string[] {
  const st = stageOf(flow, key), run = job.stages[key]!, out: string[] = [];
  const left = run.checks.filter(c => !c).length;
  if (left) out.push(`${left} kontrol adımı işaretlenmedi`);
  if (st.photoRequired && run.photos === 0) out.push("Fotoğraf eklenmeli");
  for (const e of validateFields(flow.fields, job.data, key)) out.push(e.message);
  if (st.kind === "decision" && !(st.branches ?? []).some(b => b.id === (choice ?? run.choice))) out.push("Bir seçenek seçilmeli");
  return out;
}

export function completeStage(job0: Job, flow: FlowDef, key: string, ctx: Ctx, opts: { choice?: string; data?: JobData } = {}): Result {
  const job = clone(job0); mustBeOpen(job);
  const run = job.stages[key];
  if (!run || !["ready", "working"].includes(run.status)) throw new FlowError("not_active", "Bu aşama şu an bitirilemez");
  if (opts.data) Object.assign(job.data, opts.data);
  const b = blockers(job, flow, key, opts.choice);
  if (b.length) throw new FlowError("blocked", b.join(", "));
  if (opts.choice) run.choice = opts.choice;
  const ev: DomainEvent[] = [];
  finish(job, flow, key, ctx, ev);
  return { job, events: ev };
}

export function reportIssue(job0: Job, flow: FlowDef, key: string, type: string, note: string, ctx: Ctx): Result {
  const job = clone(job0); mustBeOpen(job);
  const run = job.stages[key];
  if (!run || !["ready", "working"].includes(run.status)) throw new FlowError("not_active", "Bu aşamada sorun bildirilemez");
  run.status = "blocked"; run.issue = { type, note, at: ctx.now, by: ctx.by };
  const ev: DomainEvent[] = [{ type: "stage.blocked", jobId: job.id, stageKey: key, by: ctx.by, issue: `${type}: ${note}`, at: ctx.now }];
  applyActions(job, flow, rulesFor(flow.rules, "stage.blocked", job, key), ctx, ev);
  return { job, events: ev };
}

export function resolveIssue(job0: Job, key: string, ctx: Ctx): Result {
  const job = clone(job0), run = job.stages[key];
  if (!run || run.status !== "blocked") throw new FlowError("not_blocked", "Bu aşamada açık sorun yok");
  run.status = run.startedAt ? "working" : "ready"; delete run.issue;
  job.log.push({ at: ctx.now, by: ctx.by, text: "Sorun çözüldü", stageKey: key });
  return { job, events: [] };
}

/** Geri gönder: hedef aşama ve ondan sonra gelen her şey yeniden açılır. */
export function sendBack(job0: Job, flow: FlowDef, from: string, to: string, note: string, ctx: Ctx): Result {
  const job = clone(job0); mustBeOpen(job);
  if (!flow.prefs.allowSendBack) throw new FlowError("not_allowed", "Bu akışta geri gönderme kapalı");
  if (!reachable(flow, to).has(from)) throw new FlowError("bad_target", "Yalnızca önceki bir aşamaya geri gönderilebilir");
  for (const k of reachable(flow, to)) job.stages[k] = { ...freshRun(k), visits: job.stages[k]!.visits };
  const ev: DomainEvent[] = [{ type: "stage.sent_back", jobId: job.id, from, to, by: ctx.by, note, at: ctx.now }];
  job.log.push({ at: ctx.now, by: ctx.by, text: `Geri gönderildi: ${note}`, stageKey: to });
  activate(job, flow, to, ctx, ev);
  return { job, events: ev };
}

/** Zamanlayıcı süresi dolunca sunucu (ya da telefon) bunu çağırır. */
export function fireTimer(job0: Job, flow: FlowDef, key: string, ctx: Ctx): Result {
  const job = clone(job0), run = job.stages[key];
  if (!run || run.status !== "working" || stageOf(flow, key).kind !== "timer") return { job, events: [] };
  const ev: DomainEvent[] = [];
  finish(job, flow, key, { ...ctx, by: "system" }, ev);
  return { job, events: ev };
}

export function holdJob(job0: Job, reason: string, ctx: Ctx): Result {
  const job = clone(job0); mustBeOpen(job);
  job.status = "on_hold"; job.log.push({ at: ctx.now, by: ctx.by, text: `Bekletildi: ${reason}` });
  return { job, events: [{ type: "job.held", jobId: job.id, reason, at: ctx.now }] };
}

export function resumeJob(job0: Job, ctx: Ctx): Result {
  const job = clone(job0);
  if (job.status !== "on_hold") throw new FlowError("not_held", "İş bekletilmiyor");
  job.status = "open"; job.log.push({ at: ctx.now, by: ctx.by, text: "Devam ettirildi" });
  return { job, events: [{ type: "job.resumed", jobId: job.id, at: ctx.now }] };
}

export function cancelJob(job0: Job, reason: string, ctx: Ctx): Result {
  const job = clone(job0);
  if (job.status === "done" || job.status === "cancelled") throw new FlowError("job_closed", "İş zaten kapalı");
  job.status = "cancelled"; job.log.push({ at: ctx.now, by: ctx.by, text: `İptal: ${reason}` });
  return { job, events: [{ type: "job.cancelled", jobId: job.id, reason, at: ctx.now }] };
}

// ---------- okuma yardımcıları ----------
export const activeStages = (job: Job, flow: FlowDef) =>
  flow.stages.filter(s => ["ready", "working", "blocked"].includes(job.stages[s.key]!.status));

export function progress(job: Job): number {
  const runs = Object.values(job.stages).filter(r => r.status !== "skipped");
  if (job.status === "done") return 100;
  return runs.length ? Math.round((runs.filter(r => r.status === "done").length / runs.length) * 100) : 0;
}

export const isLate = (job: Job, now: number) => job.status === "open" && job.due < now;

export function tasksFor(jobs: Job[], flows: Record<string, FlowDef>, personId: string) {
  return jobs.flatMap(job => {
    const flow = flows[job.flowId];
    if (!flow || job.status !== "open") return [];
    return activeStages(job, flow).filter(s => job.stages[s.key]!.crew.includes(personId) || job.stages[s.key]!.owner === personId).map(s => ({ job, stage: s, run: job.stages[s.key]! }));
  });
}
