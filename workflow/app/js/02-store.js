/* ---------- durum ---------- */
const KEY = "wf-v5";
let S = null;
const R = { tab: "today", stack: [], lastKey: "", focusNext: true, sheet: null, filter: "aktif", jobView: "liste", q: "", flowView: null, chatOpenMsg: null };

function fresh() {
  return { v: 1, phase: "welcome", me: "", biz: { name: "", sector: "" }, people: [], groups: WF.DEFAULT_GROUPS, flows: {}, jobs: [], customers: [], threads: [], notices: [],
    prefs: { theme: "system", size: "m", contrast: "normal", motion: "on", bold: false, quiet: true, digest: true, notify: { mine: true, issues: true, done: true, chat: true } },
    offline: false, queue: [], nextNo: 1001, dismissed: [], setup: {} };
}
function load() { try { const r = localStorage.getItem(KEY); S = r ? { ...fresh(), ...JSON.parse(r) } : fresh(); } catch { S = fresh(); } }
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* depolama kapalıysa yine çalışır */ } }, 150); }

/* ---------- kişiler ve yetki ---------- */
const person = id => S.people.find(p => p.id === id);
const first = id => person(id)?.name.split(" ")[0] ?? (id === "system" ? "Sistem" : "—");
const groupOf = id => S.groups.find(g => g.key === person(id)?.group) || S.groups[3];
const can = (perm, id = S.me) => groupOf(id).perms.includes(perm);
const home = (id = S.me) => groupOf(id).home;
const isMgr = (id = S.me) => ["boss", "foreman"].includes(home(id));
const DEPTS = { yonetim: "Yönetim", olcum: "Keşif ve ölçü", uretim: "Üretim", kaynak: "Kaynak", boya: "Boya", kalite: "Kalite", depo: "Depo", sofor: "Teslimat", montaj: "Montaj", muhasebe: "Muhasebe", servis: "Servis" };
const loadOf = id => S.jobs.reduce((n, j) => n + (j.status === "open" ? Object.values(j.stages).filter(r => ["ready", "working", "blocked"].includes(r.status) && (r.owner === id)).length : 0), 0);

/* ---------- akış modeli: sıralı liste → motorun grafiği ----------
   Kullanıcı aşamaları sıralı dizer. "Öncekiyle aynı anda" işaretli aşamalar paralel grup olur.
   Karar aşamasının "evet" dalı sıradakine, "hayır" dalı seçilen önceki aşamaya döner (döngü). */
const KINDS = {
  task: { n: "İş", d: "Birinin yapacağı iş", ic: "box" },
  approval: { n: "Onay", d: "Kontrol edip onaylar", ic: "check" },
  decision: { n: "Karar", d: "Evet/hayır; hayırda geri döner", ic: "flow" },
  appointment: { n: "Randevu", d: "Keşif, ölçü, saha ziyareti", ic: "cal" },
  wait: { n: "Dışarıyı bekle", d: "Tedarikçi, müşteri", ic: "clock" },
  timer: { n: "Süre bekle", d: "Kuruma, dinlenme; kendiliğinden geçer", ic: "clock" },
  delivery: { n: "Teslimat", d: "İmza ve fotoğrafla teslim", ic: "truck" },
  invoice: { n: "Fatura", d: "Fatura kesilir (e-Fatura hazır)", ic: "doc" },
  payment: { n: "Tahsilat", d: "Ödeme alınır, link gönderilir", ic: "money" },
  notify: { n: "Müşteriye bilgi", d: "Otomatik mesaj gider, beklemez", ic: "send" },
};
function toFlow(m) {
  const groups = [];
  m.steps.forEach((s, i) => { if (s.par && i && groups.length && m.steps[i - 1].kind !== "decision" && s.kind !== "decision") groups.at(-1).push(s); else groups.push([s]); });
  const stages = [];
  groups.forEach((g, gi) => {
    const nxt = groups[gi + 1] || [];
    for (const s of g) {
      const st = { key: s.key, name: s.name, kind: s.kind, assign: s.assign, next: s.kind === "decision" ? [] : nxt.map(x => x.key), checklist: s.checklist || [], photoRequired: !!s.photo,
        signatureRequired: s.kind === "delivery", slaMinutes: s.sla ? s.sla * 60 : undefined, timerMinutes: s.kind === "timer" ? (s.timer || 12) * 60 : undefined, publicName: s.pub || s.name, messageTemplate: s.kind === "notify" ? "asama_bilgi" : undefined };
      if (s.kind === "decision") st.branches = [{ id: "evet", label: s.yes || "Uygun", to: nxt[0]?.key || s.key }, { id: "hayir", label: s.no || "Uygun değil", to: s.back || m.steps[0].key }];
      stages.push(st);
    }
  });
  return { id: m.id, version: m.version || 1, name: m.name, icon: m.icon || "flow", stages, start: groups[0] ? groups[0].map(s => s.key) : [], fields: m.fields || [], rules: m.rules || [], prefs: { notifyCustomer: true, customerCanSee: true, allowSendBack: true }, hidden: !!m.hidden, model: m };
}
function modelErrors(m) {
  const e = [];
  if (!m.name.trim()) e.push("Akışa bir ad ver.");
  if (!m.steps.length) e.push("En az bir aşama ekle.");
  m.steps.forEach((s, i) => {
    if (!s.name.trim()) e.push(`${i + 1}. aşamanın adı boş.`);
    if (s.kind === "decision" && i === m.steps.length - 1) e.push(`"${s.name || "Karar"}" son aşama olamaz; evet dalı bir sonrakine gider.`);
    if (s.kind === "decision" && m.steps[i + 1]?.par) e.push(`"${s.name}" kararından sonra aynı anda yürüyen aşama olamaz.`);
    if (s.kind === "decision" && s.back && m.steps.findIndex(x => x.key === s.back) >= i) e.push(`"${s.name}": hayır dalı yalnızca önceki bir aşamaya dönebilir.`);
    if (!s.assign || (s.assign.mode === "dept" && !s.assign.dept)) e.push(`"${s.name}" için kimin yapacağını seç.`);
  });
  if (!e.length) e.push(...WF.validateFlow(toFlow(m)));
  return e;
}

/* ---------- motor bağlantısı ---------- */
function resolver(st, job) {
  const a = st.assign || {};
  if (a.mode === "person" && a.person) return { owner: a.person, crew: [a.person] };
  if (a.mode === "creator") return { owner: job.createdBy, crew: [job.createdBy] };
  const pool = S.people.filter(p => (p.depts || []).includes(a.dept) && p.joined !== false);
  const pick = pool.sort((x, y) => loadOf(x.id) - loadOf(y.id))[0] || S.people.find(p => home(p.id) === "foreman") || S.people.find(p => home(p.id) === "boss");
  return pick ? { owner: pick.id, crew: [pick.id] } : { owner: null, crew: [] };
}
const ctx = (by = S.me) => ({ now: Date.now(), by, resolve: resolver });
const flowOf = j => S.flows[j.flowId];
const jobById = id => S.jobs.find(j => j.id === id);
const stageDef = (j, k) => flowOf(j).stages.find(s => s.key === k);

function threadFor(job) {
  let t = S.threads.find(x => x.kind === "job" && x.jobId === job.id);
  if (!t) { t = { id: "t" + job.id, kind: "job", jobId: job.id, msgs: [], read: {} }; S.threads.push(t); }
  return t;
}
const sysMsg = (job, text, at = Date.now()) => threadFor(job).msgs.push({ id: uid(), by: "system", at, kind: "sys", text });
function notify(to, text, jobId, kind = "mine") { S.notices.unshift({ id: uid(), to, text, jobId, at: Date.now(), read: false, kind }); S.notices.length = Math.min(S.notices.length, 150); }

function onEvents(events, job) {
  const f = flowOf(job);
  for (const e of events) {
    const st = e.stageKey ? f.stages.find(s => s.key === e.stageKey) : null;
    if (e.type === "stage.ready" && e.owner) { notify(e.owner, `${job.title}: ${st.name} sana düştü`, job.id); if (job.flowId !== "_task") sysMsg(job, `${st.name} başladı · ${first(e.owner)} bilgilendirildi`); }
    if (e.type === "stage.completed" && e.by !== "system" && job.flowId !== "_task") sysMsg(job, `${first(e.by)} ${st.name} aşamasını bitirdi${e.choice ? ` · ${st.branches.find(b => b.id === e.choice).label}` : ""}`);
    if (e.type === "stage.blocked") { for (const p of S.people.filter(x => isMgr(x.id))) notify(p.id, `${job.title}: sorun · ${e.issue}`, job.id, "issues"); sysMsg(job, `Sorun bildirildi: ${e.issue}`); }
    if (e.type === "job.completed") { notify(job.createdBy, `${job.title} tamamlandı`, job.id, "done"); if (job.flowId !== "_task") sysMsg(job, "İş tamamlandı"); }
    if (e.type === "message.requested") sysMsg(job, `Müşteriye WhatsApp mesajı gitti: "${job.title} · ${st ? st.publicName || st.name : "durum"}" (deneme)`);
    if (e.type === "invoice.requested") sysMsg(job, "Fatura taslağı hazırlandı; e-Fatura bağlanınca otomatik kesilir");
    if (e.type === "payment.requested") sysMsg(job, "Tahsilat bekleniyor; ödeme linki müşteriye gönderilebilir");
    if (e.type === "notify") notify(e.to.startsWith("role:") ? S.people.find(p => home(p.id) === "boss")?.id : e.to, e.text, job.id);
  }
  if (S.offline) S.queue.push(...events.map(e => ({ type: e.type, jobId: job.id, at: e.at })));
}

/* her değişiklik: anlık görüntü → uygula → geri alınabilir bildirim */
let undoSnap = null;
function snapshot() { return JSON.stringify({ jobs: S.jobs, notices: S.notices, threads: S.threads, queue: S.queue, nextNo: S.nextNo, people: S.people }); }
function act(fn, msg, opts = {}) {
  const snap = snapshot();
  try {
    const out = fn();
    save();
    undoSnap = opts.noUndo ? null : snap;
    render();
    if (msg) toast(typeof msg === "function" ? msg(out) : msg, opts.sub ? (typeof opts.sub === "function" ? opts.sub(out) : opts.sub) : "", !opts.noUndo);
    return out;
  } catch (e) {
    toast("Olmadı", e && e.message ? e.message : String(e), false, true);
    return null;
  }
}
function undo() { if (!undoSnap) return; Object.assign(S, JSON.parse(undoSnap)); undoSnap = null; save(); render(); toast("Geri alındı", "", false); }

function commit(r) {
  const i = S.jobs.findIndex(j => j.id === r.job.id);
  if (i >= 0) S.jobs[i] = r.job; else S.jobs.unshift(r.job);
  onEvents(r.events, r.job);
  return r.job;
}
const cmd = {
  create(flowId, input) {
    const f = S.flows[flowId];
    const j = commit(WF.createJob(f, { id: uid(), businessId: "local", number: S.nextNo++, ...input }, ctx()));
    if (j.flowId !== "_task") sysMsg(j, `${first(S.me)} işi açtı`);
    return j;
  },
  task({ title, who, due, note, steps, urgent }) {
    return who.map(w => {
      const data = {}; if (note) data.not = note; if (steps?.length) data.adimlar = steps.join("\n");
      const r = WF.createJob(S.flows._task, { id: uid(), businessId: "local", number: S.nextNo++, title, due, data, urgent: !!urgent }, { ...ctx(), resolve: () => ({ owner: w, crew: [w] }) });
      r.job.stages.gorev.checks = (steps || []).map(() => false);
      return commit(r);
    });
  },
  start: (id, k) => commit(WF.startStage(jobById(id), flowOf(jobById(id)), k, ctx())),
  done: (id, k, o = {}) => commit(WF.completeStage(jobById(id), flowOf(jobById(id)), k, ctx(), o)),
  check(id, k, i) { const j = WF.toggleCheck(jobById(id), k, i); S.jobs[S.jobs.findIndex(x => x.id === id)] = j; return j; },
  photo(id, k) { const j = WF.addPhoto(jobById(id), k); S.jobs[S.jobs.findIndex(x => x.id === id)] = j; return j; },
  issue: (id, k, type, note) => commit(WF.reportIssue(jobById(id), flowOf(jobById(id)), k, type, note, ctx())),
  resolve: (id, k) => { const j = commit(WF.resolveIssue(jobById(id), k, ctx())); sysMsg(j, `${first(S.me)} sorunu çözdü`); return j; },
  back: (id, from, to, note) => commit(WF.sendBack(jobById(id), flowOf(jobById(id)), from, to, note, ctx())),
  hold: (id, why) => commit(WF.holdJob(jobById(id), why, ctx())),
  resume: id => commit(WF.resumeJob(jobById(id), ctx())),
  cancel: (id, why) => commit(WF.cancelJob(jobById(id), why, ctx())),
  reassign(id, k, to) {
    const j = jobById(id), r = j.stages[k], from = r.owner;
    r.owner = to; r.crew = [to]; j.log.push({ at: Date.now(), by: S.me, text: `${stageDef(j, k).name}: ${first(from)} → ${first(to)}` , stageKey: k });
    notify(to, `${j.title}: ${stageDef(j, k).name} sana verildi`, id); if (j.flowId !== "_task") sysMsg(j, `${first(S.me)} ${stageDef(j, k).name} aşamasını ${first(to)}'a verdi`);
    return j;
  },
  tick() {
    let changed = false;
    for (const j of S.jobs) if (j.status === "open") for (const s of WF.activeStages(j, flowOf(j))) {
      const r = j.stages[s.key];
      if (s.kind === "timer" && r.status === "working" && (r.dueAt || Infinity) <= Date.now()) { commit(WF.fireTimer(j, flowOf(j), s.key, ctx("system"))); changed = true; }
    }
    if (changed) { save(); render(); }
  },
};

/* ---------- okuma yardımcıları ---------- */
const openJobs = () => S.jobs.filter(j => j.status === "open" || j.status === "on_hold");
const isTask = j => j.flowId === "_task";
const active = j => j.status === "open" ? WF.activeStages(j, flowOf(j)) : [];
const late = j => WF.isLate(j, Date.now());
const blockedSt = j => active(j).filter(s => j.stages[s.key].status === "blocked");
const waitingApproval = j => active(j).filter(s => ["approval", "decision"].includes(s.kind) && j.stages[s.key].status === "ready");
function myWork(id = S.me) {
  const out = [];
  for (const j of S.jobs) if (j.status === "open") for (const s of WF.activeStages(j, flowOf(j))) {
    const r = j.stages[s.key];
    if (r.owner === id || r.crew.includes(id)) out.push({ j, s, r });
  }
  const rank = x => (x.r.status === "working" ? 0 : x.r.status === "blocked" ? 1 : 2) * 1e14 + (x.j.urgent ? 0 : 5e13) + x.j.due;
  return out.sort((a, b) => rank(a) - rank(b));
}
function jobState(j) {
  if (j.status === "done") return { l: "Bitti", c: "ok", i: "check" };
  if (j.status === "cancelled") return { l: "İptal edildi", c: "", i: "x" };
  if (j.status === "on_hold") return { l: "Bekletiliyor", c: "warn", i: "pause" };
  const a = active(j);
  if (blockedSt(j).length) return { l: "Sorun var", c: "bad", i: "alert" };
  const w = a.find(s => j.stages[s.key].status === "working");
  if (w) return { l: `${w.name} · çalışılıyor`, c: "acc", i: null, live: true };
  const first0 = a[0];
  if (!first0) return { l: "Açık", c: "", i: "clock" };
  if (["approval", "decision"].includes(first0.kind)) return { l: `${first0.name} · onay bekliyor`, c: "warn", i: "clock" };
  if (first0.kind === "timer") return { l: `${first0.name} · süre bekleniyor`, c: "", i: "clock" };
  return { l: `${first0.name} · sırada`, c: "", i: "clock" };
}
const pill = st => `<span class="pill ${st.c}">${st.live ? '<span class="dot live" aria-hidden="true"></span>' : st.i ? ic(st.i) : ""}${esc(st.l)}</span>`;
const unread = () => S.notices.filter(n => !n.read && n.to === S.me).length;
const threadUnread = t => t.msgs.filter(m => m.by !== S.me && m.kind !== "sys" && m.at > (t.read?.[S.me] || 0)).length;
const visibleThreads = () => S.threads.filter(t => t.kind !== "job" || (() => { const j = jobById(t.jobId); return j && (isMgr() || Object.values(j.stages).some(r => r.owner === S.me || r.crew.includes(S.me)) || j.createdBy === S.me); })())
  .filter(t => t.kind !== "dm" || t.members.includes(S.me));
