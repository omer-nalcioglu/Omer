import Storage from "./storage";
import { useSyncExternalStore } from "react";
import {
  BUILTIN_FLOWS, DEFAULT_GROUPS, QUICK_TASK_FLOW, addPhoto as coreAddPhoto, completeStage, createJob as coreCreateJob, reportIssue, resolveIssue,
  sendBack as coreSendBack, startStage, toggleCheck as coreToggle, fireTimer, activeStages,
  type DomainEvent, type FlowDef, type Job, type JobData, type OwnerResolver, type Permission, type PermissionGroup, type Person, type Result,
} from "@workflow/core";
import { seedDemo } from "./demo";

/**
 * Uygulama durumu. Bugün "demo" modunda telefonda yaşar; "cloud" modunda aynı eylemler Supabase'teki
 * `apply-command` fonksiyonuna gider (bkz. src/data/remote.ts). Ekranlar yalnızca bu dosyadaki eylemleri çağırır,
 * böylece arka uç değiştiğinde ekranlara dokunulmaz.
 */
export interface Notice { id: string; at: number; to: string; text: string; jobId?: string; read: boolean }

export interface AppState {
  loaded: boolean;
  mode: "none" | "demo" | "cloud";
  businessName: string;
  me: string;
  people: Person[];
  groups: PermissionGroup[];
  flows: Record<string, FlowDef>;
  jobs: Job[];
  nextNumber: number;
  pending: DomainEvent[];   // sunucuya gönderilecek olaylar (çevrimdışı kuyruk)
  notices: Notice[];
}

const KEY = "workflow.state.v1";
const empty = (): AppState => ({
  loaded: true, mode: "none", businessName: "", me: "", people: [], groups: DEFAULT_GROUPS,
  flows: Object.fromEntries(BUILTIN_FLOWS.map(f => [f.id, f])), jobs: [], nextNumber: 1001, pending: [], notices: [],
});

let state: AppState = { ...empty(), loaded: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function set(next: AppState) {
  state = next; emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { Storage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, 250);
}

export async function boot() {
  try {
    const raw = await Storage.getItem(KEY);
    state = raw ? { ...empty(), ...JSON.parse(raw), loaded: true } : empty();
  } catch { state = empty(); }
  emit();
}

export function useApp<T>(pick: (s: AppState) => T): T {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => pick(state));
}
export const getState = () => state;

// ---------------------------------------------------------------- kimlik ve yetki
export const person = (id: string) => state.people.find(p => p.id === id);
export const groupOf = (id: string) => state.groups.find(g => g.key === person(id)?.group) ?? DEFAULT_GROUPS[3]!;
export const can = (p: Permission, id = state.me) => groupOf(id).perms.includes(p);
export const homeOf = (id = state.me) => groupOf(id).home;
export const firstName = (id: string) => person(id)?.name.split(" ")[0] ?? "Sistem";

// ---------------------------------------------------------------- atama
const loadOf = (id: string) => state.jobs.reduce((n, j) => n + Object.values(j.stages).filter(r => ["ready", "working"].includes(r.status) && r.owner === id).length, 0);
const resolver: OwnerResolver = (st, job) => {
  if (st.assign.mode === "person" && st.assign.person) return { owner: st.assign.person, crew: [st.assign.person] };
  if (st.assign.mode === "creator") return { owner: job.createdBy, crew: [job.createdBy] };
  if (st.assign.mode === "pool") return { owner: null, crew: [] };
  const pool = state.people.filter(p => p.depts.includes(st.assign.dept ?? ""));
  const pick = pool.sort((a, b) => loadOf(a.id) - loadOf(b.id))[0] ?? state.people.find(p => groupOf(p.id).home === "foreman") ?? state.people[0];
  return pick ? { owner: pick.id, crew: [pick.id] } : { owner: null, crew: [] };
};
const ctx = () => ({ now: Date.now(), by: state.me, resolve: resolver });

// ---------------------------------------------------------------- olaylardan bildirim
function noticesFrom(events: DomainEvent[], job: Job): Notice[] {
  const out: Notice[] = [];
  const flow = state.flows[job.flowId];
  for (const e of events) {
    const id = `${e.type}:${e.at}:${Math.random().toString(36).slice(2, 7)}`;
    if (e.type === "stage.ready" && e.owner && e.owner !== state.me) {
      const st = flow?.stages.find(s => s.key === e.stageKey);
      out.push({ id, at: e.at, to: e.owner, text: `${job.title}: ${st?.name ?? "yeni aşama"} sana düştü`, jobId: job.id, read: false });
    }
    if (e.type === "stage.blocked") out.push({ id, at: e.at, to: "role:foreman", text: `${job.title}: sorun bildirildi · ${e.issue}`, jobId: job.id, read: false });
    if (e.type === "job.completed") out.push({ id, at: e.at, to: job.createdBy, text: `${job.title} tamamlandı`, jobId: job.id, read: false });
    if (e.type === "notify") out.push({ id, at: e.at, to: e.to, text: e.text, jobId: job.id, read: false });
  }
  return out;
}

function commit(r: Result) {
  const jobs = state.jobs.some(j => j.id === r.job.id) ? state.jobs.map(j => (j.id === r.job.id ? r.job : j)) : [r.job, ...state.jobs];
  set({ ...state, jobs, pending: [...state.pending, ...r.events], notices: [...noticesFrom(r.events, r.job), ...state.notices].slice(0, 200) });
  return r.job;
}
const jobById = (id: string) => state.jobs.find(j => j.id === id)!;
const flowOf = (j: Job) => state.flows[j.flowId]!;

// ---------------------------------------------------------------- eylemler (ekranlar yalnızca bunları çağırır)
export const actions = {
  startDemo() { set({ ...seedDemo(empty()), loaded: true }); },
  signOut() { Storage.removeItem(KEY).catch(() => {}); set(empty()); },
  switchUser(id: string) { set({ ...state, me: id }); },
  markRead() { set({ ...state, notices: state.notices.map(n => (visibleNotice(n) ? { ...n, read: true } : n)) }); },

  createJob(flowId: string, input: { title: string; customerName: string; due: number; qty?: number; urgent?: boolean; amount?: number; data?: JobData }) {
    const flow = state.flows[flowId]!;
    const r = coreCreateJob(flow, { id: uid(), businessId: "local", number: state.nextNumber, ...input }, ctx());
    state = { ...state, nextNumber: state.nextNumber + 1 };
    return commit(r);
  },
  giveTask(input: { title: string; who: string[]; due: number; note?: string; steps?: string[] }) {
    return input.who.map(w => {
      const data: JobData = {};
      if (input.note) data.not = input.note;
      if (input.steps?.length) data.adimlar = input.steps.join("\n");
      const r = coreCreateJob(QUICK_TASK_FLOW, { id: uid(), businessId: "local", number: state.nextNumber, title: input.title, due: input.due, data },
        { ...ctx(), resolve: () => ({ owner: w, crew: [w] }) });
      r.job.stages.gorev!.checks = (input.steps ?? []).map(() => false);
      state = { ...state, nextNumber: state.nextNumber + 1 };
      return commit(r);
    });
  },
  start(jobId: string, key: string) { return commit(startStage(jobById(jobId), flowOf(jobById(jobId)), key, ctx())); },
  complete(jobId: string, key: string, opts: { choice?: string; data?: JobData } = {}) { return commit(completeStage(jobById(jobId), flowOf(jobById(jobId)), key, ctx(), opts)); },
  toggleCheck(jobId: string, key: string, i: number) { const j = coreToggle(jobById(jobId), key, i); set({ ...state, jobs: state.jobs.map(x => (x.id === jobId ? j : x)) }); },
  addPhoto(jobId: string, key: string) { const j = coreAddPhoto(jobById(jobId), key); set({ ...state, jobs: state.jobs.map(x => (x.id === jobId ? j : x)) }); },
  reportIssue(jobId: string, key: string, type: string, note: string) { return commit(reportIssue(jobById(jobId), flowOf(jobById(jobId)), key, type, note, ctx())); },
  resolve(jobId: string, key: string) { return commit(resolveIssue(jobById(jobId), key, ctx())); },
  sendBack(jobId: string, from: string, to: string, note: string) { return commit(coreSendBack(jobById(jobId), flowOf(jobById(jobId)), from, to, note, ctx())); },
  /** Süresi dolan zamanlayıcıları bitirir (bulutta bunu sunucu yapar). */
  tick() {
    const now = Date.now();
    for (const j of state.jobs) {
      if (j.status !== "open") continue;
      for (const s of activeStages(j, flowOf(j))) {
        const run = j.stages[s.key]!;
        if (s.kind === "timer" && run.status === "working" && (run.dueAt ?? Infinity) <= now) commit(fireTimer(jobById(j.id), flowOf(j), s.key, ctx()));
      }
    }
  },
};

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function visibleNotice(n: Notice) {
  if (n.to === state.me) return true;
  if (n.to === "role:foreman") return ["boss", "foreman"].includes(homeOf());
  if (n.to === "role:patron") return homeOf() === "boss";
  return false;
}
