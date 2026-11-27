/* ---------- ekran yönetimi ---------- */
const TABS = () => isMgr()
  ? [["today", "home", "Bugün"], ["jobs", "list", "İşler"], ...(can("create") ? [["plus", "plus", "Yeni"]] : []), ["chat", "chat", "Sohbet"], ["menu", "menu", "Menü"]]
  : [["today", home() === "driver" ? "truck" : "home", home() === "driver" ? "Teslimat" : "Bugün"], ["chat", "chat", "Sohbet"], ["menu", "menu", "Menü"]];
const top = () => R.stack.at(-1);
function go(view, params = {}) { R.stack.push({ view, ...params }); R.focusNext = true; render(); scrollTop(); }
function goBack() { R.stack.pop(); R.focusNext = true; render(); }
function switchTab(t) { R.tab = t; R.stack = []; R.focusNext = true; render(); scrollTop(); }
const scrollTop = () => { const s = $("#screen"); if (s) s.scrollTop = 0; window.scrollTo(0, 0); };

function applyPrefs() {
  const p = S.prefs, el = document.documentElement;
  p.theme === "system" ? el.removeAttribute("data-theme") : el.setAttribute("data-theme", p.theme);
  el.setAttribute("data-size", p.size); el.setAttribute("data-contrast", p.contrast); el.setAttribute("data-motion", p.motion); el.setAttribute("data-bold", p.bold ? "1" : "0");
}
function render() {
  applyPrefs();
  protoBar();
  const main = $("#main");
  let html, key;
  if (S.phase === "welcome") { html = R.login ? viewSetup() : viewWelcome(); key = R.login ? "setup" : "welcome"; }
  else {
    const t = top();
    if (t) {
      key = t.view + (t.id || "");
      html = t.view === "job" ? viewJob(t.id) : t.view === "thread" ? viewThread(t.id) : t.view === "team" ? viewTeam() : t.view === "customers" ? viewCustomers() : t.view === "flows" ? viewFlows()
        : t.view === "flowedit" ? viewFlowEdit() : t.view === "reports" ? viewReports() : t.view === "a11y" ? viewA11y() : t.view === "notif" ? viewNotif() : t.view === "integrations" ? viewIntegrations() : viewWhy();
    } else {
      key = R.tab + S.me;
      html = R.tab === "jobs" ? viewJobs() : R.tab === "chat" ? viewChat() : R.tab === "menu" ? viewMenu() : viewToday();
    }
  }
  const changed = key !== R.lastKey;
  // aynı ekranda yeniden çizimde arama kutusundaki imleç korunur
  const qFocus = document.activeElement?.id === "q" ? document.activeElement.selectionStart : null;
  main.innerHTML = html;
  if (!changed) $$(".enter", main).forEach(e => e.classList.remove("enter"));
  R.lastKey = key;
  if (qFocus != null && $("#q")) { $("#q").focus(); $("#q").setSelectionRange(qFocus, qFocus); }
  if (changed && R.focusNext) { const h = $("h1", main); if (h) h.focus({ preventScroll: true }); }
  R.focusNext = false;
  // alt menü
  const nav = $("#tabs");
  if (S.phase !== "app") { nav.innerHTML = ""; nav.hidden = true; return; }
  nav.hidden = false;
  const chatN = visibleThreads().reduce((a, t) => a + threadUnread(t), 0), jobsN = isMgr() ? openJobs().filter(j => late(j) || blockedSt(j).length).length : 0;
  nav.innerHTML = TABS().map(([k, i, l]) => k === "plus"
    ? `<button class="tab plus" data-a="plus" aria-label="Yeni oluştur"><span class="pip">${ic(i)}</span>${l}</button>`
    : `<button class="tab" data-a="tab" data-v="${k}" ${R.tab === k && !top() ? 'aria-current="page"' : ""}><span class="pip">${ic(i)}${k === "chat" && chatN ? `<span class="badge" aria-label="${chatN} okunmamış">${chatN}</span>` : k === "jobs" && jobsN ? `<span class="badge" aria-label="${jobsN} dikkat gerektiren">${jobsN}</span>` : ""}</span>${l}</button>`).join("");
}
function protoBar() {
  const sel = $("#who");
  if (S.phase !== "app") { $("#proto").hidden = true; return; }
  $("#proto").hidden = false;
  const opts = S.people.map(p => `<option value="${p.id}" ${p.id === S.me ? "selected" : ""}>${esc(p.name)} · ${esc(groupOf(p.id).name)}</option>`).join("");
  if (sel.dataset.sig !== opts) { sel.innerHTML = opts; sel.dataset.sig = opts; }
  sel.value = S.me;
  $("#net").setAttribute("aria-pressed", S.offline);
  $("#net").textContent = S.offline ? "İnternet yok" : "Çevrimiçi";
}

/* ---------- bildirim (geri al ile) ---------- */
let toastT;
function toast(title, sub = "", withUndo = true, bad = false) {
  const root = $("#toasts");
  root.innerHTML = `<div class="toast" role="${bad ? "alert" : "status"}">${ic(bad ? "alert" : "check")}<div><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>${withUndo && undoSnap ? `<button class="undo" data-a="undo">Geri al</button>` : "<span></span>"}</div>`;
  clearTimeout(toastT); toastT = setTimeout(() => { root.innerHTML = ""; }, withUndo ? 6000 : 4000);
}

/* ---------- dokunma ---------- */
const splitK = k => k.split("|");
document.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, d = b.dataset;
  if (a === "scrim") { if (e.target === b) closeSheet(); return; }
  if (b.getAttribute("aria-disabled") === "true" && !["finish"].includes(a) && b.type !== "submit") return;
  switch (a) {
    case "close": return closeSheet();
    case "undo": return undo();
    case "tab": return switchTab(d.v);
    case "back": return goBack();
    case "go": return go(d.v);
    case "plus": if (S.setup && "job" in S.setup) { /* başlarken listesi */ } return sheetPlus();
    case "notices": return sheetNotices();
    case "notice": { const n = S.notices.find(x => x.id === d.id); n.read = true; save(); closeSheet(); if (n.jobId && jobById(n.jobId)) go("job", { id: n.jobId }); else render(); return; }
    case "readall": S.notices.forEach(n => { if (n.to === S.me) n.read = true; }); save(); closeSheet(); render(); return;
    case "job": closeSheet(); return go("job", { id: d.id });
    case "thread": closeSheet(); return go("thread", { id: d.id });
    case "person": return sheetPerson(d.id);
    case "filter": R.filter = d.f; R.jobView = "liste"; if (d.stay) { render(); return; } R.tab = "jobs"; R.stack = []; R.focusNext = true; render(); scrollTop(); return;
    case "jobview": R.jobView = d.v; return render();
    case "flowview": R.flowView = d.id; return render();
    case "demo": seedDemo(); save(); R.tab = "today"; R.stack = []; R.focusNext = true; render(); toast("Örnek işletme açıldı", "Üstten kimin gözüyle bakacağını seçebilirsin", false); return;
    case "login": R.login = d.v; R.focusNext = true; return render();
    case "welcome": R.login = null; R.focusNext = true; return render();
    case "sector": R.setup = { me: $("#su-me").value, biz: $("#su-biz").value, sector: d.v }; return render();
    case "setup-close": S.setup.closed = true; save(); return render();
    case "signout": localStorage.removeItem(KEY); S = fresh(); R.login = null; R.stack = []; R.tab = "today"; R.focusNext = true; render(); return;
    // görev kartı
    case "start": { const [id, k] = splitK(d.k); return act(() => cmd.start(id, k), "Başladın", { sub: "Sayaç çalışıyor" }); }
    case "check": { const [id, k] = splitK(d.k); cmd.check(id, k, +d.i); save(); render(); const el = $(`[data-a="check"][data-k="${d.k}"][data-i="${d.i}"]`); if (el) el.focus(); return; }
    case "choose": { const [id, k] = splitK(d.k); (R.choice ??= {})[d.k] = d.v; render(); const el = $(`[data-a="choose"][data-k="${d.k}"][data-v="${d.v}"]`); if (el) el.focus(); return; }
    case "photo": { const [id, k] = splitK(d.k); act(() => cmd.photo(id, k), "Fotoğraf eklendi", { sub: "Prototipte gerçek fotoğraf çekilmez" }); return; }
    case "voice": { const [id, k] = splitK(d.k); const j = jobById(id); act(() => { j.log.push({ at: Date.now(), by: S.me, text: "Sesli not ekledi (0:12)", stageKey: k }); return j; }, "Sesli not eklendi", { sub: "Prototipte kayıt yapılmaz" }); return; }
    case "issue": return sheetIssue(d.k);
    case "issue-type": R.issue.type = d.v; $$('[data-a="issue-type"]').forEach(x => x.setAttribute("aria-checked", x.dataset.v === d.v)); return;
    case "resolve": { const [id, k] = splitK(d.k); return act(() => cmd.resolve(id, k), "Sorun çözüldü", { sub: "İş kaldığı yerden devam ediyor" }); }
    case "sign": return sheetSign(d.k);
    case "sig-clear": { const cv = $("#sig"); cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); R.signed = false; return; }
    case "sig-save": { const name = $("#sg-name").value.trim(); if (!name && !R.signed) { $("#sg-name").setAttribute("aria-invalid", "true"); $("#sg-name").focus(); toast("İmza ya da ad gerekli", "", false, true); return; }
      const [id, k] = splitK(d.k), j = jobById(id); j.data["_imza_" + k] = name || "İmzalı"; closeSheet(); act(() => j, "İmza alındı", { noUndo: true }); return; }
    case "finish": {
      const [id, k] = splitK(d.k), j = jobById(id), s = stageDef(j, k), sel = R.choice?.[d.k];
      const bl = WF.blockers(j, flowOf(j), k, sel).concat(s.kind === "delivery" && !j.data["_imza_" + k] ? ["Teslim alanın imzası ya da adı gerekli"] : []);
      if (bl.length) { toast("Henüz bitirilemez", bl.join(", "), false, true); const why = $(`#why-${id}-${k}`); if (why) why.scrollIntoView({ block: "center" }); return; }
      const before = myWork().length;
      return act(() => cmd.done(id, k, sel ? { choice: sel } : {}), () => (s.kind === "decision" ? "Karar kaydedildi" : s.kind === "approval" ? "Onaylandı" : "Bitti"), { sub: () => { const nx = myWork()[0]; const st = jobById(id); return st.status === "done" ? "İş tamamlandı, açan kişiye haber gitti" : nx && !isMgr() ? `Sıradaki işin: ${isTask(nx.j) ? nx.j.title : nx.s.name}` : "Sıradaki kişiye bildirim gitti"; } });
    }
    case "assign": return sheetAssign(d.k);
    case "assign-to": { const [id, k] = splitK(d.k); closeSheet(); return act(() => cmd.reassign(id, k, d.id), `${first(d.id)}'a verildi`, { sub: "Bildirim gitti" }); }
    case "public": return sheetPublic(d.id);
    case "copy": navigator.clipboard?.writeText(d.v).then(() => toast("Bağlantı kopyalandı", "", false), () => { $("#pl").select(); toast("Bağlantıyı seçtim", "Kopyalamak için basılı tut", false); }); return;
    case "jobmenu": return sheetJobMenu(d.id);
    case "hold": closeSheet(); return act(() => cmd.hold(d.id, "Patron bekletti"), "İş bekletiliyor", { sub: "Kimseye iş düşmeyecek" });
    case "resume": closeSheet(); return act(() => cmd.resume(d.id), "İş devam ediyor");
    case "urgent": { closeSheet(); const j = jobById(d.id); return act(() => { j.urgent = true; j.log.push({ at: Date.now(), by: S.me, text: "Acil işaretlendi" }); return j; }, "Acil işaretlendi"); }
    case "sendback": return sheetSendBack(d.id);
    case "sendback-to": closeSheet(); return act(() => cmd.back(d.id, d.from, d.to, `${first(S.me)} geri gönderdi`), "Geri gönderildi", { sub: `${stageDef(jobById(d.id), d.to).name} yeniden açıldı` });
    case "cancel-ask": return dialogCancel(d.id);
    case "cancel-do": { const why = $("#cx-why").value.trim() || "Belirtilmedi"; closeSheet(); act(() => cmd.cancel(d.id, why), "İş iptal edildi", { noUndo: true }); return; }
    case "tip": { const t = suggestions().find(x => x.id === d.id); if (!t) return; const w = t[d.w === "alt" ? "alt" : "apply"]; S.dismissed.push(t.id); return act(() => w.do(), w.msg); }
    case "tipx": S.dismissed.push(d.id); save(); render(); toast("Öneri gizlendi", "", false); return;
    // ＋ ve formlar
    case "taskform": closeSheet(); return sheetTask();
    case "task-for": closeSheet(); return sheetTask({ who: [d.id] });
    case "newjob": closeSheet(); return sheetJob();
    case "newjob-for": return sheetJob({ cust: S.customers.find(c => c.id === d.id).name });
    case "customer": closeSheet(); return sheetCustomer();
    case "add-person": closeSheet(); return sheetAddPerson();
    case "smart-edit": { const p = parseSmart($("#sm-in").value); closeSheet(); return p.kind === "job" ? sheetJob({ flow: p.flowId, cust: p.customer?.name, title: p.title, urgent: p.urgent }) : sheetTask({ title: p.title, who: p.who, urgent: p.urgent, day: p.dueDay ?? 0, hour: p.hour ?? 17 }); }
    case "tf-who": { const w = R.tf.who; const i = w.indexOf(d.id); i >= 0 ? w.splice(i, 1) : w.push(d.id); b.setAttribute("aria-pressed", w.includes(d.id)); return; }
    case "tf-day": R.tf.day = +d.v; $$('[data-a="tf-day"]').forEach(x => x.setAttribute("aria-checked", x === b)); return;
    case "tf-urgent": R.tf.urgent = !R.tf.urgent; b.setAttribute("aria-checked", R.tf.urgent); return;
    case "jf-flow": syncJf(); R.jf.flow = d.id; R.jf.data = {}; $(".sheet form").outerHTML = jobForm(); $(`[data-a="jf-flow"][data-id="${d.id}"]`).focus(); return;
    case "jf-day": R.jf.day = +d.v; $$('[data-a="jf-day"]').forEach(x => x.setAttribute("aria-checked", x === b)); return;
    case "jf-urgent": R.jf.urgent = !R.jf.urgent; b.setAttribute("aria-pressed", R.jf.urgent); return;
    case "jf-field": R.jf.data[d.k] = d.v; $$(`[data-a="jf-field"][data-k="${d.k}"]`).forEach(x => x.setAttribute("aria-checked", x === b)); return;
    // sohbet
    case "msg": R.chatOpenMsg = R.chatOpenMsg === d.id ? null : d.id; render(); { const el = $(`[data-a="msg"][data-id="${d.id}"]`); if (el) el.focus(); } return;
    case "totask": { const t = S.threads.find(x => x.id === d.t), m = t.msgs.find(x => x.id === d.id); const p = parseSmart(m.text); const ment = S.people.filter(x => trn(m.text).includes("@" + trn(first(x.id)))).map(x => x.id);
      R.chatOpenMsg = null; return sheetTask({ title: p.title.replace(/@\S+\s*/g, "").trim() || m.text.slice(0, 80), who: ment.length ? ment : m.by !== S.me ? [m.by] : [], note: `Sohbetten · ${first(m.by)}` }); }
    case "reply": { const i = $("#msg-in"); i.value = `@${d.v} `; i.focus(); return; }
    case "quickreply": { const i = $("#msg-in"); i.value = d.v; i.focus(); return; }
    case "dm": case "dm-foreman": { closeSheet(); const other = a === "dm" ? d.id : S.people.find(p => home(p.id) === "foreman")?.id || S.people.find(p => home(p.id) === "boss").id;
      let t = S.threads.find(x => x.kind === "dm" && x.members.includes(S.me) && x.members.includes(other)); if (!t) { t = { id: "dm" + uid(), kind: "dm", members: [S.me, other], msgs: [], read: {} }; S.threads.push(t); save(); }
      return go("thread", { id: t.id }); }
    // ayarlar
    case "pref": S.prefs[d.k] = d.v; save(); render(); { const el = $(`[data-a="pref"][data-k="${d.k}"][data-v="${d.v}"]`); if (el) el.focus(); } return;
    case "pref-sw": { const k = d.k; if (k === "contrast") S.prefs.contrast = S.prefs.contrast === "high" ? "normal" : "high"; else if (k === "motion") S.prefs.motion = S.prefs.motion === "off" ? "on" : "off"; else S.prefs[k] = !S.prefs[k]; save(); render(); const el = $(`[data-a="pref-sw"][data-k="${k}"]`); if (el) el.focus(); return; }
    case "notif-sw": S.prefs.notify[d.k] = !S.prefs.notify[d.k]; save(); render(); { const el = $(`[data-a="notif-sw"][data-k="${d.k}"]`); if (el) el.focus(); } return;
    // akış tasarlayıcısı
    case "flows": S.setup.flow = true; save(); return go("flows");
    case "editflow": FE = JSON.parse(JSON.stringify(S.flows[d.id].model)); FE.version = S.flows[d.id].version; return go("flowedit");
    case "newflow": FE = { id: "f" + uid().slice(-5), name: "", steps: [], fields: [], _new: true }; return go("flowedit");
    case "fe-move": { const i = +d.i, j2 = i + +d.d; [FE.steps[i], FE.steps[j2]] = [FE.steps[j2], FE.steps[i]]; if (FE.steps[0]) FE.steps[0].par = false; FE._checked = FE._checked; FE._sim = null; render(); const el = $(`[data-a="fe-move"][data-i="${j2}"][data-d="${d.d}"]`) || $(`[data-a="fe-edit"][data-i="${j2}"]`); el?.focus(); return; }
    case "fe-edit": return sheetStepEdit(+d.i);
    case "fe-add": FE.steps.push({ key: "s" + uid().slice(-5), name: "", kind: "task", assign: { mode: "dept", dept: "uretim" } }); FE._sim = null; render(); return sheetStepEdit(FE.steps.length - 1);
    case "st-sw": b.setAttribute("aria-checked", b.getAttribute("aria-checked") !== "true"); return;
    case "st-del": FE.steps.splice(+d.i, 1); FE._sim = null; closeSheet(); render(); toast("Aşama silindi", "", false); return;
    case "fe-check": FE._checked = true; render(); $('[role="status"]', $("#main"))?.scrollIntoView({ block: "center" }); return;
    case "fe-sim": { FE._checked = true; const errs = modelErrors(FE); if (errs.length) { render(); return; } FE._sim = simulate(FE); render(); return; }
    case "fe-save": { FE._checked = true; const errs = modelErrors(FE); if (errs.length) { render(); toast("Kaydedilmedi", `${errs.length} şey düzeltilmeli`, false, true); return; }
      const old = S.flows[FE.id], m = JSON.parse(JSON.stringify(FE)); delete m._checked; delete m._sim; delete m._new; m.version = (old?.version || 0) + 1;
      S.flows[FE.id] = toFlow(m); save(); goBack(); toast(old ? `Sürüm ${m.version} kaydedildi` : "Akış oluşturuldu", "Yeni işler bu sürümle açılacak", false); return; }
  }
});
function syncJf() { if (!R.jf) return; R.jf.cust = $("#jf-cust")?.value ?? R.jf.cust; R.jf.title = $("#jf-title")?.value ?? R.jf.title; R.jf.qty = $("#jf-qty")?.value ?? R.jf.qty; R.jf.amount = $("#jf-amount")?.value ?? R.jf.amount; $$("[data-jf-field]").forEach(i => { R.jf.data[i.dataset.jfField] = i.value; }); }
function simulate(m) {
  const f = toFlow(JSON.parse(JSON.stringify(m))), path = [];
  let r = WF.createJob(f, { id: "sim", businessId: "x", number: 0, title: "Deneme", due: Date.now() + 9 * DAY, data: Object.fromEntries(f.fields.map(x => [x.key, x.options ? x.options[0] : "deneme"])) }, { now: Date.now(), by: S.me, resolve: resolver });
  for (let guard = 0; guard < 40 && r.job.status === "open"; guard++) {
    const s = WF.activeStages(r.job, f)[0]; if (!s) break;
    const run = r.job.stages[s.key]; run.checks = run.checks.map(() => true); run.photos = 1;
    path.push(`${s.name} · ${first(run.owner) || "sahibi yok"}${WF.activeStages(r.job, f).length > 1 ? ` (aynı anda: ${WF.activeStages(r.job, f).slice(1).map(x => x.name).join(", ")})` : ""}`);
    r = WF.completeStage(r.job, f, s.key, { now: Date.now(), by: S.me, resolve: resolver }, s.kind === "decision" ? { choice: "evet" } : {});
  }
  path.push(r.job.status === "done" ? "İş tamamlanır" : "Akış bir yerde takıldı");
  return { path, choice: "evet" };
}

/* ---------- formlar ---------- */
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  const k = f.dataset.form;
  if (k === "send") { const i = $("#msg-in"), v = i.value.trim(); if (!v) { i.focus(); return; } const t = S.threads.find(x => x.id === f.dataset.id); t.msgs.push({ id: uid(), by: S.me, at: Date.now(), kind: "text", text: v });
    for (const p of S.people) if (p.id !== S.me && trn(v).includes("@" + trn(first(p.id)))) notify(p.id, `${first(S.me)} seni andı: ${v.slice(0, 60)}`, t.jobId, "chat");
    if (S.offline) S.queue.push({ type: "message", at: Date.now() }); save(); render(); $("#msg-in")?.focus(); const s = $("#screen"); if (s) s.scrollTop = s.scrollHeight; window.scrollTo(0, document.body.scrollHeight); return; }
  if (k === "smart") { const p = parseSmart($("#sm-in").value);
    if (!p.title || (p.kind === "task" && !p.who.length)) { $("#sm-in").focus(); return; }
    closeSheet();
    if (p.kind === "job") { const c = p.customer; return act(() => { const j = cmd.create(p.flowId, { title: p.title, customerName: c.name, customerId: c.id, due: p.due || atHour(3), urgent: p.urgent }); S.setup.job = true; return j; }, "İş emri açıldı", { sub: j => `#${j.number} · ilk aşama ${first(active(j)[0] ? j.stages[active(j)[0].key].owner : S.me)}'a düştü` }); }
    return act(() => cmd.task({ title: p.title, who: p.who, due: p.due || atHour(0), urgent: p.urgent }), p.who.length > 1 ? `${p.who.length} kişiye görev verildi` : "Görev verildi", { sub: `${p.who.map(first).join(", ")} · ${when(p.due || atHour(0))}` }); }
  if (k === "task") { const t = $("#tf-title").value.trim(), st = R.tf, err = $("#tf-err");
    if (!t) { err.textContent = "Ne yapılacağını yaz."; $("#tf-title").setAttribute("aria-invalid", "true"); $("#tf-title").focus(); return; }
    if (!st.who.length) { err.textContent = "Görevi kime vereceğini seç."; $('[data-a="tf-who"]').focus(); return; }
    const due = atHour(st.day, +$("#tf-hour").value), steps = $("#tf-steps").value.split("\n").map(x => x.trim()).filter(Boolean), note = $("#tf-note").value.trim();
    closeSheet(); return act(() => cmd.task({ title: t, who: st.who, due, note, steps, urgent: st.urgent }), st.who.length > 1 ? `${st.who.length} kişiye görev verildi` : "Görev verildi", { sub: `${st.who.map(first).join(", ")} · ${when(due)}` }); }
  if (k === "job") { syncJf(); const st = R.jf, err = $("#jf-err"), f2 = S.flows[st.flow];
    const miss = [!st.cust.trim() && ["#jf-cust", "Müşteriyi yaz."], !st.title.trim() && ["#jf-title", "İşin adını yaz."], ...f2.fields.filter(x => x.requiredAt === "create" && !String(st.data[x.key] || "").trim()).map(x => [`#jf-f-${x.key}`, `${x.label} gerekli.`])].filter(Boolean);
    $$(".sheet .in").forEach(i => i.removeAttribute("aria-invalid"));
    if (miss.length) { err.textContent = miss.map(m => m[1]).join(" "); miss.forEach(m => $(m[0])?.setAttribute("aria-invalid", "true")); $(miss[0][0])?.focus(); return; }
    let c = S.customers.find(x => trn(x.name) === trn(st.cust)); if (!c) { c = { id: "c" + uid(), name: st.cust.trim() }; S.customers.push(c); }
    closeSheet();
    return act(() => { const j = cmd.create(st.flow, { title: st.title.trim(), customerName: c.name, customerId: c.id, due: atHour(st.day), qty: Number(st.qty) || 1, urgent: st.urgent, amount: st.amount ? WF.tl(Number(String(st.amount).replace(/\./g, "").replace(",", "."))) : 0, data: Object.fromEntries(Object.entries(st.data).filter(([, v]) => v !== "")) }); S.setup.job = true; return j; },
      "İş emri açıldı", { sub: j => `#${j.number} · ilk aşama ${first(active(j)[0] ? j.stages[active(j)[0].key].owner : S.me)}'a düştü` }); }
  if (k === "issue") { if (!R.issue.type) { $("#is-err").textContent = "Sorunun türünü seç."; $('[data-a="issue-type"]').focus(); return; }
    const [id, sk] = splitK(R.issue.k), note = $("#is-note").value.trim(); closeSheet(); return act(() => cmd.issue(id, sk, R.issue.type, note), "Sorun bildirildi", { sub: "Ustabaşı ve patron bilgilendirildi" }); }
  if (k === "person") { const n = $("#ap-name").value.trim(), ph = $("#ap-phone").value.trim(), err = $("#ap-err");
    if (!n) { err.textContent = "Ad soyad gerekli."; $("#ap-name").focus(); return; } if (ph.replace(/\D/g, "").length < 10) { err.textContent = "Davet için 10 haneli telefon gerekli."; $("#ap-phone").focus(); return; }
    const g = $("#ap-grp").value, dept = $("#ap-dept").value; closeSheet(); return act(() => { S.people.push({ id: "p" + uid(), name: n, phone: ph, title: DEPTS[dept] || "Çalışan", group: g, depts: [dept], joined: false }); S.setup.team = true; }, `${n} davet edildi`, { sub: `Davet linki ${ph} numarasına gider (prototipte gönderilmez)` }); }
  if (k === "customer") { const n = $("#cu-name").value.trim(); if (!n) { $("#cu-err").textContent = "Müşterinin adını yaz."; $("#cu-name").focus(); return; } closeSheet(); return act(() => S.customers.push({ id: "c" + uid(), name: n, phone: $("#cu-phone").value.trim() }), "Müşteri eklendi"); }
  if (k === "setup") { const me = $("#su-me").value.trim(), biz = $("#su-biz").value.trim(), sec = R.setup?.sector;
    const err = !me ? ["#su-me", "Adını yaz."] : !biz ? ["#su-biz", "İşletmenin adını yaz."] : !sec ? ['[data-a="sector"]', "Ne iş yaptığınızı seç."] : null;
    if (err) { $("#su-err").textContent = err[1]; $(err[0]).focus(); return; }
    seedNew({ me, biz, sector: sec, method: R.login }); save(); R.login = null; R.tab = "today"; R.stack = []; R.focusNext = true; render(); toast(`${biz} hazır`, "Başlarken listesinden devam edebilirsin", false); return; }
  if (k === "step") { const i = +f.dataset.i, s = FE.steps[i];
    s.name = $("#st-name").value.trim() || s.name; s.kind = $("#st-kind").value; const own = $("#st-own").value;
    s.assign = own.startsWith("d:") ? { mode: "dept", dept: own.slice(2) } : { mode: own };
    if ($("#st-yes")) { s.yes = $("#st-yes").value.trim(); s.no = $("#st-no").value.trim(); s.back = $("#st-back").value || FE.steps[0].key; }
    if (s.kind === "decision" && !s.back) s.back = FE.steps[0].key;
    if ($("#st-timer")) s.timer = +$("#st-timer").value || 12;
    s.checklist = $("#st-check").value.split("\n").map(x => x.trim()).filter(Boolean); s.sla = +$("#st-sla").value || undefined;
    s.photo = $('[data-k="photo"]', f).getAttribute("aria-checked") === "true"; const par = $('[data-k="par"]', f); s.par = par ? par.getAttribute("aria-checked") === "true" : false;
    if (!s.name) { $("#st-name").setAttribute("aria-invalid", "true"); $("#st-name").focus(); return; }
    FE._sim = null; closeSheet(); render(); $(`[data-a="fe-edit"][data-i="${i}"]`)?.focus(); return; }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "q") { R.q = t.value; const jl = $("#jl"); if (jl) { const html = viewJobs(); const tmp = document.createElement("div"); tmp.innerHTML = html; jl.innerHTML = $("#jl", tmp).innerHTML; $$(".chips [data-stay]").forEach((c, i) => { const x = $$(".chips [data-stay]", tmp)[i]; if (x) c.innerHTML = x.innerHTML; }); } return; }
  if (t.id === "sm-in") { $("#sm-out").innerHTML = smartPreview(t.value); return; }
  if (t.id === "fe-name") { FE.name = t.value; return; }
  if (t.id === "su-me" || t.id === "su-biz") { R.setup = { ...(R.setup || {}), me: $("#su-me").value, biz: $("#su-biz").value }; return; }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "who") { S.me = t.value; save(); R.tab = "today"; R.stack = []; R.focusNext = true; closeSheet(); render(); scrollTop(); toast(`${person(S.me).name} gözüyle`, groupOf(S.me).name, false); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && R.sheet) { e.preventDefault(); closeSheet(); return; }
  trapFocus(e);
});
$("#net").addEventListener("click", () => {
  S.offline = !S.offline;
  if (!S.offline && S.queue.length) { const n = S.queue.length; S.queue = []; toast("Bağlantı geldi", `${n} değişiklik gönderildi`, false); } else if (S.offline) toast("İnternet yok", "Çalışmaya devam et; değişiklikler sıraya girer", false);
  save(); render();
});
$("#reset").addEventListener("click", () => { closeSheet(); seedDemo(); save(); R.tab = "today"; R.stack = []; R.focusNext = true; render(); toast("Örnek işletme baştan kuruldu", "", false); });

/* ---------- saat, sayaç, zamanlayıcı ---------- */
setInterval(() => { $$("[data-timer]").forEach(el => { el.textContent = clock(+el.dataset.timer); }); }, 1000);
setInterval(() => { const t = $("#sbTime"); if (t) t.textContent = hm(Date.now()); if (S.phase === "app") cmd.tick(); }, 30000);

document.documentElement.lang = "tr";
load();
if (S.phase === "app" && !S.people.length) S = fresh();
R.focusNext = false;
render();
{ const t = $("#sbTime"); if (t) t.textContent = hm(Date.now()); }
