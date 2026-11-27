/* ---------- ortak parçalar ---------- */
const greet = () => { const h = new Date().getHours(); return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar"; };
const today = () => new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
function head(eyebrow, title, right = "") {
  return `<header class="top"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1></div>${right}</header>`;
}
const bellBtn = () => { const n = unread(); return `<button class="x" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r);position:relative" data-a="notices" aria-label="Bildirimler${n ? `, ${n} okunmamış` : ""}">${ic("bell")}${n ? `<span class="badge" style="position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:var(--bad);color:#fff;font-size:.6875rem;font-weight:800;display:grid;place-items:center;border:2px solid var(--bg)">${n}</span>` : ""}</button>`; };
const offlineBar = () => S.offline ? `<div class="offline" role="status">${ic("wifi")}<span>İnternet yok. Çalışmaya devam edebilirsin; ${S.queue.length ? `${S.queue.length} değişiklik` : "değişiklikler"} bağlantı gelince gönderilecek.</span></div>` : "";

function jobRow(j) {
  const st = jobState(j), p = WF.progress(j), lt = late(j);
  return `<button class="job" data-a="job" data-id="${j.id}" aria-label="${esc(j.title)}, ${esc(st.l)}${lt ? ", gecikti" : ""}">
    <span class="job-h"><span class="t">${esc(j.title)}</span><span class="no">#${j.number}</span></span>
    <span class="s">${isTask(j) ? `Görev · ${esc(first(active(j)[0] ? j.stages[active(j)[0].key].owner : j.createdBy))}` : esc(j.customerName)} · Termin ${esc(dayLabel(j.due))}</span>
    ${isTask(j) ? "" : `<span class="prog ${lt || st.c === "bad" ? "bad" : j.status === "done" ? "ok" : ""}" role="progressbar" aria-label="İlerleme" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></span>`}
    <span class="st">${pill(st)}${lt ? `<span class="pill bad">${ic("clock")}Gecikti</span>` : ""}${j.urgent ? `<span class="pill acc">${ic("flag")}Acil</span>` : ""}${isTask(j) ? "" : `<span class="pct">%${p}</span>`}</span>
  </button>`;
}

/* ---------- görev kartı: tek iş, tek ana düğme, neden kapalı olduğu yazılı ---------- */
const ISSUES = ["Malzeme eksik", "Makine arızası", "Ölçü / çizim hatalı", "Müşteri yerinde yok", "İş güvenliği", "Diğer"];
function taskCard(j, s, compact) {
  const r = j.stages[s.key], k = `${j.id}|${s.key}`, mine = r.owner === S.me || r.crew.includes(S.me);
  const steps = isTask(j) ? String(j.data.adimlar || "").split("\n").filter(Boolean) : s.checklist || [];
  const sel = R.choice?.[k];
  const sig = s.kind === "delivery" ? (j.data["_imza_" + s.key] || "") : "";
  const blockers = WF.blockers(j, flowOf(j), s.key, sel).concat(s.kind === "delivery" && !sig ? ["Teslim alanın imzası ya da adı gerekli"] : []);
  const by = isTask(j) && j.createdBy !== S.me ? ` · ${first(j.createdBy)} verdi` : "";
  const label = isTask(j) ? `Görev${by}` : `İş emri #${j.number}`;
  const status = r.status === "working" ? `<span class="pill acc"><span class="dot live" aria-hidden="true"></span>Çalışıyorsun</span>` : r.status === "blocked" ? `<span class="pill bad">${ic("alert")}Sorun bildirildi</span>` : ["approval", "decision"].includes(s.kind) ? `<span class="pill warn">${ic("clock")}Onayını bekliyor</span>` : `<span class="pill">${ic("clock")}Sırada</span>`;
  const primaryLabel = s.kind === "decision" ? "Kararı kaydet" : s.kind === "approval" ? "Onayla" : s.kind === "delivery" ? "Teslim edildi" : s.kind === "wait" ? "Geldi, devam" : s.kind === "invoice" ? "Fatura kesildi" : s.kind === "payment" ? "Ödeme alındı" : "İşi bitirdim";
  const needsStart = r.status === "ready" && ["task", "appointment"].includes(s.kind);
  let body = "";
  if (r.status === "blocked") body = `<div class="issue" role="note"><b>${esc(r.issue.type)}</b><span>${esc(r.issue.note || "Not eklenmedi")}</span><span class="xs muted">${esc(first(r.issue.by))} · ${esc(ago(r.issue.at))} · yöneticiler bilgilendirildi</span></div>${isMgr() ? `<button class="btn line block" data-a="resolve" data-k="${k}">${ic("check")}Sorun çözüldü, devam etsin</button>` : ""}`;
  else if (s.kind === "timer") body = `<div class="note"><b>Süre bekleniyor</b><span>${esc(when(r.dueAt))} bitince kendiliğinden ${esc(nextName(j, s))} aşamasına geçer.</span></div>`;
  else {
    const checks = steps.length && !compact ? `<div role="group" aria-label="Kontrol adımları" style="display:grid;gap:8px">${steps.map((t, i) => `<button class="check" role="checkbox" aria-checked="${!!r.checks[i]}" data-a="check" data-k="${k}" data-i="${i}"><span class="bx">${ic("check", "s")}</span><span>${esc(t)}</span></button>`).join("")}</div>` : "";
    const decision = s.kind === "decision" ? `<div role="radiogroup" aria-label="${esc(s.name)}" class="grid2">${s.branches.map(b => `<button class="chip" role="radio" aria-checked="${sel === b.id}" data-a="choose" data-k="${k}" data-v="${b.id}" style="justify-content:center;min-height:52px;border-radius:var(--r)">${esc(b.label)}</button>`).join("")}</div>${sel === "hayir" ? `<p class="hint">${ic("undo", "s")}İş "${esc(s.branches[1].to && stageDef(j, s.branches[1].to).name)}" aşamasına geri döner, ilgili kişiye haber gider.</p>` : ""}` : "";
    const delivery = s.kind === "delivery" && !compact ? (sig ? `<div class="note" style="background:var(--ok-soft)"><b>${ic("check", "s")} Teslim alan: ${esc(sig)}</b></div>` : `<button class="btn line block" data-a="sign" data-k="${k}">${ic("pen")}Teslim alanın imzasını al</button>`) : "";
    const tools = !compact && !["decision", "invoice", "payment"].includes(s.kind) ? `<div class="grid3">
        <button class="tool" data-a="photo" data-k="${k}">${ic("camera")}${r.photos ? `Fotoğraf · ${r.photos}` : "Fotoğraf"}</button>
        <button class="tool" data-a="voice" data-k="${k}">${ic("mic")}Sesli not</button>
        <button class="tool bad" data-a="issue" data-k="${k}">${ic("alert")}Sorun var</button></div>` : "";
    const timer = r.status === "working" ? `<p class="timer num" data-timer="${r.startedAt}" aria-label="Geçen süre">${clock(r.startedAt)}</p>` : "";
    const primary = needsStart
      ? `<button class="btn big block" data-a="start" data-k="${k}">${ic("play")}İşe başla</button>`
      : `<button class="btn ok big block" data-a="finish" data-k="${k}" ${blockers.length ? `aria-disabled="true" aria-describedby="why-${j.id}-${s.key}"` : ""}>${ic("check")}${primaryLabel}</button>${blockers.length ? `<p class="hint" id="why-${j.id}-${s.key}">${ic("alert", "s")}<span>Bitirmeden önce: ${esc(blockers.join(", ").toLocaleLowerCase("tr-TR"))}.</span></p>` : ""}`;
    body = `${timer}${checks}${decision}${delivery}${tools}${mine || can("approve") ? primary : `<p class="hint">${ic("user", "s")}Bu aşama ${esc(first(r.owner))}'da.</p>`}`;
  }
  return `<article class="task ${r.status}" aria-labelledby="tt-${j.id}-${s.key}">
    <div class="task-h"><span class="eyebrow">${esc(label)}</span>${status}</div>
    <div style="display:grid;gap:6px"><h3 id="tt-${j.id}-${s.key}">${esc(isTask(j) ? j.title : `${s.name} · ${j.title}`)}</h3>
      ${j.data.not ? `<p class="muted">${esc(j.data.not)}</p>` : ""}
      <p class="facts"><span>${ic("clock", "s")}Termin ${esc(when(j.due))}</span>${j.customerName ? `<span>${ic("user", "s")}${esc(j.customerName)}</span>` : ""}${!isTask(j) ? `<span>${ic("box", "s")}${esc(j.qty)} ${esc(j.unit)}</span>` : ""}${j.urgent ? `<span style="color:var(--accent-ink)">${ic("flag", "s")}Acil</span>` : ""}</p></div>
    ${body}
    ${compact ? `<button class="btn ghost" data-a="job" data-id="${j.id}">Ayrıntılar${ic("chev", "s")}</button>` : ""}
  </article>`;
}
function nextName(j, s) { const n = s.next?.[0]; return n ? stageDef(j, n).name : "sonraki"; }

/* ---------- BUGÜN ---------- */
function viewToday() {
  const me = person(S.me), h = home();
  if (h === "worker" || h === "driver") return viewTodayWorker(me, h);
  const open = openJobs().filter(j => !isTask(j)), lt = open.filter(late), blk = open.filter(j => blockedSt(j).length), appr = open.filter(j => waitingApproval(j).length);
  const parts = [lt.length && `${lt.length} iş gecikmede`, blk.length && `${blk.length} işte sorun var`, appr.length && `${appr.length} iş onay bekliyor`].filter(Boolean);
  const tone = lt.length || blk.length ? "bad" : parts.length ? "warn" : "ok";
  const mine = myWork().slice(0, 3);
  const tips = suggestions();
  const attention = [...new Set([...blk, ...lt, ...appr])].slice(0, 5);
  const todayDel = open.filter(j => sod(j.due) === sod()).length;
  const setup = S.setup && Object.keys(S.setup).length && !S.setup.closed ? setupCard() : "";
  const team = S.people.filter(p => p.id !== S.me);
  return `<div class="page enter">
    ${head(`${esc(S.biz.name)} · ${today()}`, `${greet()}, ${esc(first(S.me))}`, bellBtn())}
    ${offlineBar()}
    ${setup}
    ${S.jobs.length ? `<section class="sum ${tone}" aria-label="Günün özeti"><span class="ic ${tone}">${ic(tone === "ok" ? "check" : "alert")}</span><div><b>${parts.length ? parts.join(", ") : "Her şey yolunda"}</b><span class="small muted">${open.length} açık iş · ${plural(team.length + 1, "kişilik ekip")}${todayDel ? ` · bugün ${todayDel} teslim` : ""}</span></div></section>
    <div class="kpis" role="list">${[[open.length, "Açık iş", "aktif", ""], [lt.length, "Geciken", "geciken", lt.length ? "bad" : ""], [appr.length, "Onay bekleyen", "onay", ""], [blk.length, "Sorunlu", "sorun", blk.length ? "bad" : ""]].map(([n, l, f, c]) => `<button class="kpi ${c}" role="listitem" data-a="filter" data-f="${f}" aria-label="${n} ${l}, listeyi aç"><span class="v num">${n}</span><span class="l">${l}</span></button>`).join("")}</div>` : ""}
    ${mine.length ? `<section class="sec" aria-labelledby="h-mine"><div class="sec-h"><h2 id="h-mine">Seni bekleyenler</h2><span class="pill acc">${myWork().length}</span></div>${mine.map(x => taskCard(x.j, x.s, true)).join("")}</section>` : ""}
    ${tips.length ? `<section class="sec" aria-labelledby="h-tips"><div class="sec-h"><h2 id="h-tips">Öneriler</h2></div>${tips.map(t => `<div class="tip"><span class="ic ${t.tone === "bad" ? "bad" : t.tone === "warn" ? "warn" : ""}">${ic(t.ic)}</span><div><b>${esc(t.title)}</b><p class="small muted">${esc(t.body)}</p></div><div class="acts"><button class="btn" data-a="tip" data-id="${t.id}" data-w="apply">${esc(t.apply.label)}</button>${t.alt ? `<button class="btn line" data-a="tip" data-id="${t.id}" data-w="alt">${esc(t.alt.label)}</button>` : ""}<button class="btn ghost" data-a="tipx" data-id="${t.id}">Gizle</button></div></div>`).join("")}</section>` : ""}
    ${S.jobs.length ? `<section class="sec" aria-labelledby="h-att"><div class="sec-h"><h2 id="h-att">Dikkat gerektirenler</h2>${attention.length ? `<button class="btn ghost" data-a="filter" data-f="aktif">Tüm işler</button>` : ""}</div>${attention.length ? `<div class="list">${attention.map(jobRow).join("")}</div>` : `<div class="empty">${ic("check", "l")}Geciken, takılan ya da onay bekleyen iş yok.</div>`}</section>` : `<div class="empty">${ic("list", "l")}<b>Henüz iş yok</b><span>İlk işini aç; aşamalar sırayla ekibine düşer, sen burada sadece dikkat gerektirenleri görürsün.</span><button class="btn" data-a="plus">${ic("plus")}İlk işi aç</button></div>`}
    ${team.length ? `<section class="sec" aria-labelledby="h-team"><div class="sec-h"><h2 id="h-team">Ekip şu an</h2><button class="btn ghost" data-a="go" data-v="team">Ekip</button></div><div class="list">${team.slice(0, 6).map(p => { const w = myWork(p.id); const cur = w.find(x => x.r.status === "working"); const blkd = w.find(x => x.r.status === "blocked"); return `<button class="row" data-a="person" data-id="${p.id}">${avatar(p)}<span><span class="t">${esc(p.name)}</span><span class="s">${blkd ? `${ic("alert", "s")} Sorun: ${esc(blkd.s.name)}` : cur ? `${esc(cur.s.name)} · ${esc(cur.j.title)}` : w.length ? `${w.length} iş sırada` : "Boşta"}</span></span><span class="pill ${blkd ? "bad" : cur ? "acc" : w.length ? "" : "ok"}">${blkd ? "Sorun" : cur ? '<span class="dot live" aria-hidden="true"></span>Çalışıyor' : w.length ? `${w.length} iş` : "Boşta"}</span></button>`; }).join("")}</div></section>` : ""}
  </div>`;
}
function setupCard() {
  const s = S.setup, items = [["team", "Ekibini ekle", "Davet linki telefonlarına gider", "users", "add-person"], ["job", "İlk işini aç", "Aşamalar sırayla ekibine düşer", "list", "plus"], ["flow", "İş akışına göz at", "Aşamaları işletmene göre düzenle", "flow", "flows"]];
  const done = items.filter(i => s[i[0]]).length;
  return `<section class="card" aria-labelledby="h-setup" style="display:grid;gap:12px"><div class="sec-h"><h2 id="h-setup">Başlarken · ${done}/3</h2><button class="btn ghost" data-a="setup-close">Gizle</button></div>
    <div class="prog"><i style="width:${done / 3 * 100}%"></i></div>
    <div class="list">${items.map(([k, t, d, i, a]) => `<button class="row" data-a="${a}" ${s[k] ? 'aria-disabled="true"' : ""}><span class="ic ${s[k] ? "ok" : ""}">${ic(s[k] ? "check" : i)}</span><span><span class="t" ${s[k] ? 'style="text-decoration:line-through;color:var(--ink-2)"' : ""}>${t}</span><span class="s">${d}</span></span>${s[k] ? "" : `<span class="chev">${ic("chev")}</span>`}</button>`).join("")}</div></section>`;
}
function viewTodayWorker(me, h) {
  const w = myWork(), cur = w[0], rest = w.slice(1);
  const doneToday = S.jobs.flatMap(j => Object.values(j.stages).filter(r => r.status === "done" && r.owner === S.me && sod(r.doneAt) === sod())).length;
  return `<div class="page enter">
    ${head(`${esc(S.biz.name)} · ${esc(me.title)}`, `${greet()}, ${esc(first(S.me))}`, bellBtn())}
    ${offlineBar()}
    <p style="font-weight:700;font-size:var(--t-lg)">${w.length ? (w.length === 1 ? "Bugün 1 işin var." : `Bugün ${w.length} işin var. En acil olan en üstte.`) : "Şu an sana düşen iş yok."}${doneToday ? ` <span class="muted small" style="font-weight:600">Bugün ${doneToday} iş bitirdin.</span>` : ""}</p>
    ${cur ? taskCard(cur.j, cur.s) : `<div class="empty">${ic("check", "l")}<b>Hepsi tamam</b><span>Yeni bir iş düştüğünde telefonuna bildirim gelir ve burada en üstte görünür.</span><button class="btn line" data-a="dm-foreman">${ic("chat")}Ustabaşına yaz</button></div>`}
    ${rest.length ? `<section class="sec" aria-labelledby="h-next"><h2 id="h-next">Sırada</h2><div class="list">${rest.map(x => `<button class="row" data-a="job" data-id="${x.j.id}"><span class="ic">${ic(KINDS[x.s.kind]?.ic || "box")}</span><span><span class="t">${esc(isTask(x.j) ? x.j.title : `${x.s.name} · ${x.j.title}`)}</span><span class="s">Termin ${esc(when(x.j.due))}${x.j.urgent ? " · acil" : ""}</span></span><span class="chev">${ic("chev")}</span></button>`).join("")}</div></section>` : ""}
  </div>`;
}

/* ---------- İŞLER ---------- */
const FILTERS = [["aktif", "Açık"], ["geciken", "Geciken"], ["sorun", "Sorunlu"], ["onay", "Onay bekleyen"], ["gorev", "Görevler"], ["biten", "Biten"]];
function match(f, j) {
  if (f === "gorev") return isTask(j) && j.status !== "cancelled";
  if (isTask(j)) return false;
  if (f === "aktif") return j.status === "open" || j.status === "on_hold";
  if (f === "geciken") return late(j); if (f === "sorun") return blockedSt(j).length > 0; if (f === "onay") return waitingApproval(j).length > 0;
  return j.status === "done" || j.status === "cancelled";
}
function viewJobs() {
  const q = trn(R.q).trim();
  const hay = j => trn(`${j.number} ${j.title} ${j.customerName}`);
  const list = S.jobs.filter(j => match(R.filter, j) && (!q || q.split(/\s+/).every(t => hay(j).includes(t)))).sort((a, b) => (b.urgent - a.urgent) || a.due - b.due);
  const flows = Object.values(S.flows).filter(f => !f.hidden);
  if (!R.flowView || !S.flows[R.flowView]) R.flowView = flows[0]?.id;
  let body;
  if (R.jobView === "pano") {
    const f = S.flows[R.flowView], jobs = S.jobs.filter(j => j.flowId === f.id && j.status === "open");
    const col = j => (active(j)[0] || {}).key;
    body = `${flows.length > 1 ? `<div class="chips" role="group" aria-label="Akış">${flows.map(x => `<button class="chip" aria-pressed="${x.id === f.id}" data-a="flowview" data-id="${x.id}">${esc(x.name)}</button>`).join("")}</div>` : ""}
      <div style="display:flex;gap:10px;overflow-x:auto;padding:0 0 8px;scroll-snap-type:x mandatory;max-width:100%" tabindex="0" aria-label="${esc(f.name)} panosu, yana kaydırılabilir">${f.stages.map(s => { const cj = jobs.filter(j => col(j) === s.key); return `<section style="flex:0 0 78%;max-width:280px;scroll-snap-align:start;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-lg);padding:10px;display:grid;gap:8px;align-content:start" aria-label="${esc(s.name)}, ${cj.length} iş"><div class="sec-h" style="min-height:28px"><b class="small">${esc(s.name)}</b><span class="pill">${cj.length}</span></div>${cj.length ? `<div class="list">${cj.map(jobRow).join("")}</div>` : `<p class="xs muted" style="padding:8px">Boş</p>`}</section>`; }).join("")}</div>`;
  } else body = list.length ? `<div class="list">${list.map(jobRow).join("")}</div>` : `<div class="empty">${ic("search", "l")}${q ? `"${esc(R.q)}" ile eşleşen iş yok. Yazımı kontrol et ya da filtreyi değiştir.` : "Bu filtrede iş yok."}</div>`;
  return `<div class="page enter">
    ${head("İş emirleri ve görevler", "İşler")}
    ${offlineBar()}
    <div class="seg" role="group" aria-label="Görünüm"><button aria-pressed="${R.jobView === "liste"}" data-a="jobview" data-v="liste">Liste</button><button aria-pressed="${R.jobView === "pano"}" data-a="jobview" data-v="pano">Pano</button></div>
    ${R.jobView === "liste" ? `<label class="search"><span class="sr">İşlerde ara</span>${ic("search")}<input id="q" type="search" value="${esc(R.q)}" placeholder="İş no, müşteri ya da iş adı" autocomplete="off" enterkeyhint="search"></label>
    <div class="chips" role="group" aria-label="Filtre">${FILTERS.map(([k, l]) => `<button class="chip" aria-pressed="${R.filter === k}" data-a="filter" data-f="${k}" data-stay="1">${l} <span class="n">${S.jobs.filter(j => match(k, j)).length}</span></button>`).join("")}</div>` : ""}
    <div id="jl" aria-live="polite">${body}</div>
  </div>`;
}

/* ---------- İŞ DETAYI ---------- */
function viewJob(id) {
  const j = jobById(id);
  if (!j) return `<div class="page">${backBtn()}<div class="empty">Bu iş silinmiş ya da bulunamadı.</div></div>`;
  const f = flowOf(j), st = jobState(j), act = active(j), p = WF.progress(j);
  const actionable = act.filter(s => { const r = j.stages[s.key]; return r.owner === S.me || r.crew.includes(S.me) || (can("approve") && ["approval", "decision"].includes(s.kind)) || r.status === "blocked"; });
  const others = act.filter(s => !actionable.includes(s));
  const t = S.threads.find(x => x.kind === "job" && x.jobId === j.id);
  return `<div class="page enter">
    ${backBtn()}
    ${head(isTask(j) ? `Görev · ${esc(first(j.createdBy))} verdi` : `İş emri #${j.number} · ${esc(f.name)}`, esc(j.title))}
    <div style="display:grid;gap:10px">
      <p class="small muted">${[j.customerName && esc(j.customerName), !isTask(j) && `${esc(j.qty)} ${esc(j.unit)}`, `Termin ${esc(when(j.due))}`, j.amount && can("money") ? esc(WF.formatTL(j.amount)) : ""].filter(Boolean).join(" · ")}</p>
      <div class="chips">${pill(st)}${late(j) ? `<span class="pill bad">${ic("clock")}Gecikti</span>` : ""}${j.urgent ? `<span class="pill acc">${ic("flag")}Acil</span>` : ""}</div>
      ${isTask(j) ? "" : `<div class="prog ${st.c === "bad" || late(j) ? "bad" : j.status === "done" ? "ok" : ""}" role="progressbar" aria-label="İlerleme yüzde ${p}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`}
    </div>
    ${j.status === "on_hold" ? `<div class="note warn"><b>İş bekletiliyor</b><span>${esc((j.log.filter(l => l.text.startsWith("Bekletildi")).at(-1) || {}).text || "")}</span>${can("assign") ? `<button class="btn line" data-a="resume" data-id="${j.id}">Devam ettir</button>` : ""}</div>` : ""}
    ${actionable.map(s => taskCard(j, s)).join("")}
    ${others.length ? `<div class="list">${others.map(s => { const r = j.stages[s.key]; return `<div class="row"><span class="ic">${ic(KINDS[s.kind]?.ic || "box")}</span><span><span class="t">${esc(s.name)}</span><span class="s">${r.status === "working" ? `${esc(first(r.owner))} çalışıyor · ${esc(ago(r.startedAt))} başladı` : r.status === "blocked" ? "Sorun bildirildi" : s.kind === "timer" ? `Bitiş ${esc(when(r.dueAt))}` : `${esc(first(r.owner))} sırada`}</span></span>${isMgr() && r.owner ? `<button class="btn line" style="min-height:40px;padding:6px 12px" data-a="assign" data-k="${j.id}|${s.key}" aria-label="${esc(s.name)} aşamasını başka birine ver">Değiştir</button>` : ""}</div>`; }).join("")}</div>` : ""}
    ${j.status === "open" || j.status === "on_hold" ? `<div class="grid2">${t || !isTask(j) ? `<button class="btn line" data-a="thread" data-id="${threadFor(j).id}">${ic("chat")}Mesajlar${t && threadUnread(t) ? ` · ${threadUnread(t)}` : ""}</button>` : ""}${!isTask(j) && j.customerName ? `<button class="btn line" data-a="public" data-id="${j.id}">${ic("link")}Müşteri linki</button>` : ""}${isMgr() ? `<button class="btn line" data-a="jobmenu" data-id="${j.id}">${ic("menu")}Diğer işlemler</button>` : ""}</div>` : ""}
    ${!isTask(j) && f.fields.some(x => j.data[x.key] != null && j.data[x.key] !== "") ? `<section class="sec" aria-labelledby="h-info"><h2 id="h-info">Bilgiler</h2><div class="list">${f.fields.filter(x => j.data[x.key] != null && j.data[x.key] !== "").map(x => `<div class="set"><span class="muted">${esc(x.label)}</span><b>${esc(j.data[x.key])}</b></div>`).join("")}</div></section>` : ""}
    ${isTask(j) ? "" : `<section class="sec" aria-labelledby="h-steps"><h2 id="h-steps">Aşamalar</h2><div class="card"><ol class="steps" style="list-style:none;margin:0;padding:0">${f.stages.map((s, i) => { const r = j.stages[s.key], cls = r.status === "done" ? "done" : r.status === "skipped" ? "skip" : r.status === "blocked" ? "blk" : ["ready", "working"].includes(r.status) ? "now" : ""; const sr = { done: "bitti", skipped: "atlandı", blocked: "sorun var", ready: "sırada", working: "çalışılıyor", locked: "bekliyor" }[r.status];
      return `<li class="step ${cls}"><span class="n" aria-hidden="true">${r.status === "done" ? ic("check", "s") : r.status === "blocked" ? "!" : i + 1}</span><div><span class="b">${esc(s.name)}</span> <span class="sr">${sr}</span><p class="small muted">${r.status === "done" ? `${esc(first(r.owner))} · ${esc(when(r.doneAt))}${r.choice ? ` · ${esc(s.branches.find(b => b.id === r.choice).label)}` : ""}${r.visits > 1 ? ` · ${r.visits}. kez` : ""}` : r.status === "skipped" ? "Atlandı" : r.owner ? `${esc(first(r.owner))}${r.status === "working" ? " · çalışıyor" : r.status === "ready" ? " · sırada" : ""}` : KINDS[s.kind].n}</p></div></li>`; }).join("")}</ol></div></section>`}
    <section class="sec" aria-labelledby="h-log"><h2 id="h-log">Hareketler</h2><div class="card" style="display:grid;gap:10px">${[...j.log].reverse().slice(0, 10).map(l => `<p class="small" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px"><span><b>${esc(first(l.by))}</b> ${esc(l.text)}</span><span class="muted xs num">${esc(when(l.at))}</span></p>`).join("")}</div></section>
  </div>`;
}
const backBtn = () => `<button class="back" data-a="back">${ic("back")}Geri</button>`;

/* ---------- SOHBET ---------- */
function threadTitle(t) {
  if (t.kind === "job") { const j = jobById(t.jobId); return j ? `#${j.number} ${j.title}` : "İş"; }
  if (t.kind === "dm") return person(t.members.find(m => m !== S.me))?.name || "Kişi";
  return t.title || "Ekip";
}
function viewChat() {
  const ts = visibleThreads().map(t => ({ t, last: t.msgs.at(-1) })).filter(x => x.last || x.t.kind !== "job").sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
  return `<div class="page enter">${head("Ekip ve işler", "Sohbet")}${offlineBar()}
    ${ts.length ? `<div class="list">${ts.map(({ t, last }) => { const n = threadUnread(t); const lead = t.kind === "job" ? `<span class="ic">#</span>` : t.kind === "dm" ? avatar(person(t.members.find(m => m !== S.me))) : `<span class="ic">${ic("users")}</span>`;
      return `<button class="row" data-a="thread" data-id="${t.id}">${lead}<span><span class="t">${esc(threadTitle(t))}</span><span class="s" style="${n ? "color:var(--ink);font-weight:650" : ""}">${last ? `${last.kind === "sys" ? "" : esc(first(last.by)) + ": "}${esc(last.text)}` : "Henüz mesaj yok"}</span></span><span style="display:grid;justify-items:end;gap:4px"><span class="xs muted">${last ? esc(ago(last.at)) : ""}</span>${n ? `<span class="pill acc" aria-label="${n} okunmamış">${n}</span>` : ""}</span></button>`; }).join("")}</div>` : `<div class="empty">Henüz sohbet yok.</div>`}
    <p class="small muted">Her işin kendi sohbeti var; aşama değişiklikleri oraya kendiliğinden düşer. Müşteri mesajları WhatsApp bağlandığında burada görünecek.</p>
  </div>`;
}
function viewThread(id) {
  const t = S.threads.find(x => x.id === id);
  if (!t) return `<div class="page">${backBtn()}<div class="empty">Sohbet bulunamadı.</div></div>`;
  t.read = t.read || {}; t.read[S.me] = Date.now(); save();
  let lastDay = "";
  const msgs = t.msgs.map(m => {
    const d = dayLabel(m.at), sep = d !== lastDay ? `<p class="sys" role="separator">${esc(d)}</p>` : ""; lastDay = d;
    if (m.kind === "sys") return sep + `<p class="sys">${esc(m.text)} · ${esc(hm(m.at))}</p>`;
    const me = m.by === S.me, open = R.chatOpenMsg === m.id;
    return sep + `<div class="msg ${me ? "me" : ""}">${me ? "" : `<span class="who">${esc(person(m.by)?.name || "")}</span>`}<button class="bub" data-a="msg" data-id="${m.id}" aria-expanded="${open}" aria-label="${esc(me ? "Sen" : first(m.by))}: ${esc(m.text)}">${esc(m.text)}</button><span class="at">${esc(hm(m.at))}</span>
      ${open ? `<div class="chips">${can("create") ? `<button class="chip" data-a="totask" data-t="${t.id}" data-id="${m.id}">${ic("bolt", "s")}Göreve çevir</button>` : ""}<button class="chip" data-a="reply" data-v="${esc(first(m.by))}">Yanıtla</button></div>` : ""}</div>`;
  }).join("");
  const j = t.kind === "job" ? jobById(t.jobId) : null;
  return `<div class="page enter" style="padding-bottom:180px">
    ${backBtn()}
    ${head(t.kind === "job" ? "İş sohbeti" : t.kind === "dm" ? "Birebir" : "Ekip kanalı", esc(threadTitle(t)), j ? `<button class="btn line" data-a="job" data-id="${j.id}" style="min-height:40px">İşi aç</button>` : "")}
    <div class="thread" role="log" aria-label="Mesajlar">${msgs || `<p class="sys">İlk mesajı sen yaz.</p>`}</div>
    <form class="composer" data-form="send" data-id="${t.id}" aria-label="Mesaj yaz">
      <div style="display:grid;gap:8px;grid-column:1/-1"><div class="quick" role="group" aria-label="Hazır yanıtlar">${["Tamam", "Geliyorum", "Fotoğraf atar mısın?", "Bitince haber ver"].map(q => `<button type="button" class="chip" data-a="quickreply" data-v="${q}">${q}</button>`).join("")}</div></div>
      <label class="sr" for="msg-in">Mesaj</label><input id="msg-in" class="in" placeholder="Mesaj yaz" autocomplete="off" enterkeyhint="send">
      <button class="btn" type="submit" aria-label="Gönder" style="width:48px;padding:0;border-radius:50%">${ic("send")}</button>
    </form>
  </div>`;
}
