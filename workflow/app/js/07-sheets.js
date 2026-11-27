/* ---------- pencere altyapısı: odak tuzağı, Esc, odağı geri verme ---------- */
let sheetReturn = null;
function openSheet(id, html, opts = {}) {
  sheetReturn = document.activeElement;
  R.sheet = id;
  const root = $("#sheets");
  root.innerHTML = `<div class="scrim ${opts.dialog ? "dialog" : ""}" data-a="scrim"><div class="sheet" role="${opts.dialog ? "alertdialog" : "dialog"}" aria-modal="true" aria-labelledby="sh-t" tabindex="-1">
    ${opts.dialog ? "" : '<div class="grab" aria-hidden="true"></div>'}
    <div class="sheet-h"><div>${opts.eyebrow ? `<p class="eyebrow">${opts.eyebrow}</p>` : ""}<h2 id="sh-t">${opts.title}</h2>${opts.sub ? `<p class="small muted" style="margin-top:4px">${opts.sub}</p>` : ""}</div><button class="x" data-a="close" aria-label="Kapat">${ic("x")}</button></div>
    ${html}</div></div>`;
  const sh = $(".sheet", root);
  setTimeout(() => { const f = opts.focus ? $(opts.focus, sh) : sh; (f || sh).focus(); }, 30);
}
function closeSheet() { R.sheet = null; $("#sheets").innerHTML = ""; if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus(); sheetReturn = null; }
function trapFocus(e) {
  const sh = $("#sheets .sheet"); if (!sh || e.key !== "Tab") return;
  const f = $$('button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', sh).filter(x => x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
}

/* ---------- ＋: akıllı ekleme ---------- */
function sheetPlus(seed = "") {
  const opts = [can("create") && ["task", "bolt", "Görev ver", "Kime, ne, ne zamana · alt adımlar"], can("create") && ["job", "list", "İş emri aç", "Akış seç, müşteri, termin"], can("create") && ["customer", "user", "Müşteri ekle", "İsim ve telefon"], can("team") && ["add-person", "users", "Çalışan ekle", "Davet linki gider"]].filter(Boolean);
  openSheet("plus", `<form data-form="smart" class="smart" novalidate>
      <label class="lbl" for="sm-in">Ne yapılacak? Tek cümle yeterli</label>
      <input id="sm-in" class="in" value="${esc(seed)}" placeholder="Ör: Murat yarın 10'da Kaya İnşaat'a numune götürsün, acil" autocomplete="off" enterkeyhint="done" aria-describedby="sm-out">
      <div id="sm-out" aria-live="polite">${smartPreview(seed)}</div>
    </form>
    <div class="list">${opts.map(([a, i, t, d]) => `<button class="row" data-a="${a === "task" ? "taskform" : a === "job" ? "newjob" : a}"><span class="ic">${ic(i)}</span><span><span class="t">${t}</span><span class="s">${d}</span></span><span class="chev">${ic("chev")}</span></button>`).join("")}</div>`,
    { title: "Ne oluşturalım?", focus: "#sm-in" });
}
function smartPreview(text) {
  if (!text.trim()) return `<p class="small muted">Yazdıkça kişi, zaman, müşteri ve aciliyet ayıklanır.</p>`;
  const p = parseSmart(text), c = (ok, label, v) => `<span class="chip ${ok ? "" : "miss"}">${label}: ${esc(v)}</span>`;
  const ok = p.title && (p.kind === "job" || p.who.length);
  return `<div class="parsed">${c(!!p.title, "Ne", p.title || "—")}${p.kind === "task" ? c(p.who.length, "Kime", p.who.map(first).join(", ") || "seç") : c(true, "Akış", S.flows[p.flowId].name)}${c(!!p.due, "Ne zaman", p.due ? when(p.due) : "bugün 17:00")}${p.customer ? c(true, "Müşteri", p.customer.name) : ""}${p.urgent ? c(true, "Öncelik", "acil") : ""}</div>
    <div class="grid2" style="margin-top:4px"><button class="btn" type="submit" ${ok ? "" : 'aria-disabled="true"'}>${p.kind === "job" ? "İş emrini aç" : p.who.length > 1 ? `${p.who.length} kişiye ver` : "Görevi ver"}</button><button class="btn line" type="button" data-a="smart-edit">Ayrıntılı düzenle</button></div>
    ${ok ? "" : `<p class="hint" style="margin-top:6px">${ic("alert", "s")}${p.kind === "task" && !p.who.length ? "Kime vereceğini cümleye yaz (ör: Murat) ya da ayrıntılı düzenle." : "Ne yapılacağını yaz."}</p>`}`;
}

/* ---------- görev ver (ayrıntılı) ---------- */
function sheetTask(pre = {}) {
  const st = R.tf = { title: pre.title || "", who: pre.who || [], day: pre.day ?? 0, hour: pre.hour ?? 17, steps: pre.steps || "", note: pre.note || "", urgent: !!pre.urgent };
  const ppl = S.people.filter(p => p.id !== S.me || S.people.length === 1);
  openSheet("task", `<form data-form="task" style="display:grid;gap:16px" novalidate>
    <div class="field"><label for="tf-title">Ne yapılacak</label><input id="tf-title" class="in" value="${esc(st.title)}" placeholder="Ör: Numuneyi Kaya İnşaat'a götür" autocomplete="off"></div>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lbl" style="margin-bottom:8px">Kime <span class="muted" style="font-weight:500">· birden fazla seçebilirsin</span></legend>
      <div class="chips">${ppl.map(p => `<button type="button" class="chip" aria-pressed="${st.who.includes(p.id)}" data-a="tf-who" data-id="${p.id}">${esc(first(p.id))}<span class="n">${loadOf(p.id) ? ` · ${loadOf(p.id)} iş` : " · boşta"}</span></button>`).join("")}</div></fieldset>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lbl" style="margin-bottom:8px">Ne zaman</legend>
      <div class="chips" role="radiogroup" aria-label="Gün">${[[0, "Bugün"], [1, "Yarın"], [Math.max(1, 5 - new Date().getDay()), "Hafta sonuna"]].map(([d, l]) => `<button type="button" class="chip" role="radio" aria-checked="${st.day === d}" data-a="tf-day" data-v="${d}">${l}</button>`).join("")}
      <label class="sr" for="tf-hour">Saat</label><select id="tf-hour" class="in" style="width:auto;min-height:40px;border-radius:999px;padding:4px 12px">${[9, 10, 12, 14, 16, 17, 18].map(h => `<option value="${h}" ${st.hour === h ? "selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}</select></div></fieldset>
    <details ${st.steps || st.note ? "open" : ""}><summary class="lbl" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Alt adımlar ve not (isteğe bağlı)</summary>
      <div style="display:grid;gap:12px;margin-top:8px"><div class="field"><label for="tf-steps">Alt adımlar · her satıra bir tane</label><textarea id="tf-steps" class="in" placeholder="Numuneyi paketle&#10;İrsaliyeyi imzalat">${esc(st.steps)}</textarea></div>
      <div class="field"><label for="tf-note">Not</label><textarea id="tf-note" class="in" placeholder="Adres, ölçü, ayrıntı">${esc(st.note)}</textarea></div></div></details>
    <div class="set" style="border:1px solid var(--line);border-radius:var(--r)"><div><b id="tf-ul">Acil</b><p class="small muted">Listesinde en üste çıkar.</p></div><button type="button" class="sw" role="switch" aria-checked="${st.urgent}" aria-labelledby="tf-ul" data-a="tf-urgent"></button></div>
    <p class="hint bad" id="tf-err" role="alert"></p>
    <button class="btn ok big block" type="submit">Görevi ver</button></form>`, { title: "Görev ver", sub: "Kişiye bildirim gider; başladığını ve bitirdiğini görürsün.", focus: "#tf-title" });
}

/* ---------- yeni iş emri ---------- */
function sheetJob(pre = {}) {
  const fs = Object.values(S.flows).filter(f => !f.hidden);
  const st = R.jf = { flow: pre.flow || fs[0]?.id, cust: pre.cust || "", title: pre.title || "", qty: 1, day: pre.day ?? 3, urgent: !!pre.urgent, amount: "", data: {} };
  openSheet("job", jobForm(), { title: "Yeni iş emri", sub: "İlk aşama hemen ilgili kişiye düşer.", focus: "#jf-cust" });
}
function jobForm() {
  const st = R.jf, f = S.flows[st.flow], fs = Object.values(S.flows).filter(x => !x.hidden);
  const fields = (f?.fields || []).filter(x => x.requiredAt === "create" || !x.requiredAt);
  return `<form data-form="job" style="display:grid;gap:16px" novalidate>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lbl" style="margin-bottom:8px">İş akışı</legend>
      <div role="radiogroup" aria-label="İş akışı" class="list">${fs.map(x => `<button type="button" class="row" role="radio" aria-checked="${x.id === st.flow}" data-a="jf-flow" data-id="${x.id}"><span class="ic" style="${x.id === st.flow ? "background:var(--accent);color:var(--on-accent)" : ""}">${ic(x.id === st.flow ? "check" : x.icon || "flow")}</span><span><span class="t">${esc(x.name)}</span><span class="s">${esc(x.stages.map(s => s.name).slice(0, 4).join(" → "))}${x.stages.length > 4 ? " …" : ""}</span></span><span></span></button>`).join("")}</div></fieldset>
    <div class="field"><label for="jf-cust">Müşteri</label><input id="jf-cust" class="in" list="cust-list" value="${esc(st.cust)}" placeholder="Ör: Kaya İnşaat" autocomplete="off"><datalist id="cust-list">${S.customers.map(c => `<option value="${esc(c.name)}"></option>`).join("")}</datalist></div>
    <div class="field"><label for="jf-title">İşin adı</label><input id="jf-title" class="in" value="${esc(st.title)}" placeholder="Ör: Çelik kapı, 12 adet" autocomplete="off"></div>
    <div class="grid2"><div class="field"><label for="jf-qty">Miktar</label><input id="jf-qty" class="in" inputmode="numeric" value="${esc(st.qty)}"></div>${can("money") ? `<div class="field"><label for="jf-amount">Tutar, ₺ (KDV hariç)</label><input id="jf-amount" class="in" inputmode="decimal" value="${esc(st.amount)}" placeholder="0"></div>` : ""}</div>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lbl" style="margin-bottom:8px">Termin</legend><div class="chips" role="radiogroup" aria-label="Termin">${[[1, "Yarın"], [3, "3 gün"], [7, "1 hafta"], [14, "2 hafta"]].map(([d, l]) => `<button type="button" class="chip" role="radio" aria-checked="${st.day === d}" data-a="jf-day" data-v="${d}">${l}</button>`).join("")}<button type="button" class="chip" aria-pressed="${st.urgent}" data-a="jf-urgent">${ic("flag", "s")}Acil</button></div></fieldset>
    ${fields.map(x => x.type === "select" ? `<fieldset style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:8px">${esc(x.label)}${x.requiredAt === "create" ? " *" : ""}</legend><div class="chips" role="radiogroup">${x.options.map(o => `<button type="button" class="chip" role="radio" aria-checked="${st.data[x.key] === o}" data-a="jf-field" data-k="${x.key}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></fieldset>`
      : `<div class="field"><label for="jf-f-${x.key}">${esc(x.label)}${x.requiredAt === "create" ? " *" : ""}</label><input id="jf-f-${x.key}" class="in" data-jf-field="${x.key}" value="${esc(st.data[x.key] || "")}" ${x.requiredAt === "create" ? 'aria-required="true"' : ""}></div>`).join("")}
    <p class="hint bad" id="jf-err" role="alert"></p>
    <button class="btn ok big block" type="submit">İşi aç</button></form>`;
}

/* ---------- diğerleri ---------- */
function sheetNotices() {
  const list = S.notices.filter(n => n.to === S.me);
  openSheet("notices", list.length ? `<div class="list">${list.slice(0, 40).map(n => `<button class="row" data-a="notice" data-id="${n.id}"><span class="dot" style="color:${n.read ? "var(--line-2)" : "var(--accent)"}" aria-hidden="true"></span><span><span class="t" style="${n.read ? "font-weight:600" : ""}">${esc(n.text)}</span><span class="s">${esc(ago(n.at))}${n.read ? "" : " · yeni"}</span></span><span class="chev">${ic("chev")}</span></button>`).join("")}</div><button class="btn line block" data-a="readall">Hepsini okundu yap</button>` : `<div class="empty">${ic("bell", "l")}Bildirim yok. Sana iş düştüğünde ya da açtığın iş bittiğinde burada görünür.</div>`, { title: "Bildirimler" });
}
function sheetIssue(k) {
  R.issue = { k, type: "" };
  openSheet("issue", `<form data-form="issue" style="display:grid;gap:14px"><div role="radiogroup" aria-label="Sorun türü" class="grid2">${ISSUES.map(t => `<button type="button" class="chip" role="radio" aria-checked="false" data-a="issue-type" data-v="${t}" style="justify-content:center;min-height:52px;border-radius:var(--r)">${t}</button>`).join("")}</div>
    <div class="field"><label for="is-note">Kısaca ne oldu? (isteğe bağlı)</label><textarea id="is-note" class="in" placeholder="Ör: 40x40 profil bitti"></textarea></div>
    <p class="hint bad" id="is-err" role="alert"></p><button class="btn danger big block" type="submit" style="background:var(--bad);color:#fff">Sorunu bildir</button></form>`, { title: "Ne sorun var?", sub: "İş duraklar; ustabaşı ve patron hemen bilgilendirilir." });
}
function sheetAssign(k) {
  const [id, key] = k.split("|"), j = jobById(id), s = stageDef(j, key), r = j.stages[key];
  const ppl = S.people.filter(p => p.id !== r.owner).sort((a, b) => ((b.depts || []).includes(s.assign?.dept) - (a.depts || []).includes(s.assign?.dept)) || loadOf(a.id) - loadOf(b.id));
  openSheet("assign", `<div class="list">${ppl.map(p => `<button class="row" data-a="assign-to" data-k="${k}" data-id="${p.id}">${avatar(p)}<span><span class="t">${esc(p.name)}</span><span class="s">${(p.depts || []).includes(s.assign?.dept) ? `${esc(DEPTS[s.assign.dept])} · ` : ""}${loadOf(p.id) ? `${loadOf(p.id)} iş` : "Boşta"}</span></span>${(p.depts || []).includes(s.assign?.dept) && !loadOf(p.id) ? '<span class="pill ok">Önerilen</span>' : ""}</button>`).join("")}</div>`, { title: `${s.name}: kim yapsın?`, sub: `Şu an ${first(r.owner)}'da. Seçtiğin kişiye bildirim gider.` });
}
function sheetPerson(id) {
  const p = person(id), w = myWork(id);
  openSheet("person", `${w.length ? `<div class="list">${w.map(x => `<button class="row" data-a="job" data-id="${x.j.id}"><span class="ic">${ic(KINDS[x.s.kind]?.ic || "box")}</span><span><span class="t">${esc(isTask(x.j) ? x.j.title : `${x.s.name} · ${x.j.title}`)}</span><span class="s">${x.r.status === "working" ? "Çalışıyor" : x.r.status === "blocked" ? "Sorun var" : "Sırada"} · termin ${esc(dayLabel(x.j.due))}</span></span><span class="chev">${ic("chev")}</span></button>`).join("")}</div>` : `<div class="empty">Şu an boşta.</div>`}
    ${p.phone ? `<p class="small muted">Telefon: <span class="num" style="user-select:all">${esc(p.phone)}</span></p>` : ""}
    <div class="grid2">${can("create") && id !== S.me ? `<button class="btn" data-a="task-for" data-id="${id}">${ic("bolt")}Görev ver</button>` : ""}${id !== S.me ? `<button class="btn line" data-a="dm" data-id="${id}">${ic("chat")}Mesaj yaz</button>` : ""}</div>`, { title: esc(p.name), eyebrow: `${esc(groupOf(id).name)} · ${esc(p.title)}` });
}
function sheetAddPerson() {
  openSheet("add-person", `<form data-form="person" style="display:grid;gap:14px" novalidate>
    <div class="field"><label for="ap-name">Ad soyad</label><input id="ap-name" class="in" autocomplete="off" placeholder="Ör: Serkan Aksoy"></div>
    <div class="field"><label for="ap-phone">Telefon</label><input id="ap-phone" class="in" inputmode="tel" autocomplete="off" placeholder="0532 123 45 67" aria-describedby="ap-ph-h"><p class="small muted" id="ap-ph-h">Davet linki WhatsApp ya da SMS ile bu numaraya gider.</p></div>
    <div class="field"><label for="ap-dept">Ne iş yapar?</label><select id="ap-dept" class="in">${Object.entries(DEPTS).filter(([k]) => k !== "yonetim").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="field"><label for="ap-grp">Yetkisi</label><select id="ap-grp" class="in"><option value="calisan">Çalışan · yalnız kendi işlerini görür</option><option value="ustabasi">Ustabaşı · her şeyi görür, iş dağıtır, onaylar</option><option value="sofor">Şoför · teslimatları görür</option><option value="yonetici">Yönetici · patron gibi, sistem ayarı hariç</option></select></div>
    <p class="hint bad" id="ap-err" role="alert"></p><button class="btn ok big block" type="submit">Ekle ve davet gönder</button></form>`, { title: "Çalışan ekle", focus: "#ap-name" });
}
function sheetCustomer() {
  openSheet("customer", `<form data-form="customer" style="display:grid;gap:14px" novalidate><div class="field"><label for="cu-name">Firma ya da kişi adı</label><input id="cu-name" class="in" autocomplete="off"></div>
    <div class="field"><label for="cu-phone">Telefon</label><input id="cu-phone" class="in" inputmode="tel" autocomplete="off"></div><p class="hint bad" id="cu-err" role="alert"></p><button class="btn ok big block" type="submit">Müşteriyi ekle</button></form>`, { title: "Müşteri ekle", focus: "#cu-name" });
}
function sheetPublic(id) {
  const j = jobById(id), f = flowOf(j), vis = f.stages.filter(s => !["notify", "invoice", "payment", "decision"].includes(s.kind));
  const cur = active(j)[0];
  openSheet("public", `<div class="public" aria-label="Müşterinin göreceği sayfa"><div class="ph"><span class="eyebrow" style="color:inherit;opacity:.85">${esc(S.biz.name)}</span><b style="font-size:var(--t-lg)">${esc(j.title)}</b><span class="small" style="opacity:.9">Tahmini teslim: ${esc(dayLabel(j.due))}</span></div>
      <div class="pb"><ol class="steps" style="list-style:none;margin:0;padding:0">${vis.map((s, i) => { const r = j.stages[s.key]; return `<li class="step ${r.status === "done" ? "done" : cur && cur.key === s.key ? "now" : ""}"><span class="n" aria-hidden="true">${r.status === "done" ? ic("check", "s") : i + 1}</span><div><span class="b">${esc(s.publicName || s.name)}</span><p class="small muted">${r.status === "done" ? "Tamamlandı" : cur && cur.key === s.key ? "Şu an bu aşamada" : ""}</p></div></li>`; }).join("")}</ol>
      <p class="xs muted">Çalışan adları, fiyat ve iç notlar müşteriye gösterilmez.</p></div></div>
    <div class="field"><label for="pl">Bağlantı</label><input id="pl" class="in num" readonly value="https://takip.workflow.app/${esc(j.id)}" onclick="this.select()"></div>
    <button class="btn block" data-a="copy" data-v="https://takip.workflow.app/${esc(j.id)}">${ic("link")}Bağlantıyı kopyala</button>`, { title: "Müşteri takip sayfası", sub: "Müşteri uygulama indirmeden işinin nerede olduğunu görür." });
}
function sheetJobMenu(id) {
  const j = jobById(id), act0 = active(j)[0], done = flowOf(j).stages.filter(s => j.stages[s.key].status === "done" && s.kind !== "notify");
  openSheet("jobmenu", `<div class="list">
    ${j.status === "open" ? `<button class="row" data-a="hold" data-id="${id}"><span class="ic warn">${ic("pause")}</span><span><span class="t">Beklet</span><span class="s">Ör: ödeme bekleniyor; kimseye iş düşmez</span></span></button>` : `<button class="row" data-a="resume" data-id="${id}"><span class="ic">${ic("play")}</span><span><span class="t">Devam ettir</span></span></button>`}
    ${act0 && done.length ? `<button class="row" data-a="sendback" data-id="${id}"><span class="ic">${ic("undo")}</span><span><span class="t">Bir aşamaya geri gönder</span><span class="s">Eksik ya da hatalı iş yeniden yapılır</span></span></button>` : ""}
    ${!j.urgent ? `<button class="row" data-a="urgent" data-id="${id}"><span class="ic">${ic("flag")}</span><span><span class="t">Acil işaretle</span><span class="s">Ekibin listesinde en üste çıkar</span></span></button>` : ""}
    <button class="row" data-a="cancel-ask" data-id="${id}"><span class="ic bad">${ic("x")}</span><span><span class="t" style="color:var(--bad)">İşi iptal et</span><span class="s">Geri alınamaz; sorulur</span></span></button></div>`, { title: "Diğer işlemler", eyebrow: `#${j.number}` });
}
function sheetSendBack(id) {
  const j = jobById(id), from = active(j)[0], done = flowOf(j).stages.filter(s => j.stages[s.key].status === "done" && s.kind !== "notify");
  openSheet("sendback", `<div class="list">${done.reverse().map(s => `<button class="row" data-a="sendback-to" data-id="${id}" data-from="${from.key}" data-to="${s.key}"><span class="ic">${ic("undo")}</span><span><span class="t">${esc(s.name)}</span><span class="s">${esc(first(j.stages[s.key].owner))} yeniden yapacak</span></span></button>`).join("")}</div>`, { title: "Nereye geri gönderilsin?", sub: "Seçtiğin aşama ve sonrası yeniden açılır." });
}
function dialogCancel(id) {
  const j = jobById(id);
  openSheet("cancel", `<p>“${esc(j.title)}” iptal edilecek. Açık aşamalar kapanır ve ekipten kimseye iş düşmez. Bu işlem geri alınamaz.</p>
    <div class="field"><label for="cx-why">Neden? (müşteri kaydında görünür)</label><input id="cx-why" class="in" placeholder="Ör: Müşteri vazgeçti"></div>
    <div class="grid2"><button class="btn line" data-a="close">Vazgeç</button><button class="btn" style="background:var(--bad);color:#fff" data-a="cancel-do" data-id="${id}">İptal et</button></div>`, { title: "İş iptal edilsin mi?", dialog: true, focus: ".btn.line" });
}
function sheetSign(k) {
  openSheet("sign", `<canvas class="sig" id="sig" aria-label="İmza alanı: parmakla imzala" role="img"></canvas>
    <div class="field"><label for="sg-name">Teslim alanın adı</label><input id="sg-name" class="in" autocomplete="off" placeholder="Ör: Levent Kaya" aria-describedby="sg-h"><p id="sg-h" class="small muted">İmza atamayan biri için adı yeterli; fotoğraf da eklenebilir.</p></div>
    <div class="grid2"><button class="btn line" data-a="sig-clear">Temizle</button><button class="btn ok" data-a="sig-save" data-k="${k}">Kaydet</button></div>`, { title: "Teslim alan imzalasın", focus: "#sg-name" });
  const cv = $("#sig"), c = cv.getContext("2d"); let draw = false;
  const fit = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; c.scale(2, 2); c.lineWidth = 2.5; c.lineCap = "round"; c.strokeStyle = getComputedStyle(document.body).color; };
  fit();
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { draw = true; cv.setPointerCapture(e.pointerId); c.beginPath(); c.moveTo(...pt(e)); R.signed = true; };
  cv.onpointermove = e => { if (draw) { c.lineTo(...pt(e)); c.stroke(); } };
  cv.onpointerup = () => { draw = false; };
}
function sheetStepEdit(i) {
  const s = FE.steps[i], prev = FE.steps.slice(0, i);
  const deptOpts = Object.entries(DEPTS).map(([k, v]) => `<option value="d:${k}" ${s.assign?.mode === "dept" && s.assign.dept === k ? "selected" : ""}>${v} (${S.people.filter(p => (p.depts || []).includes(k)).length} kişi)</option>`).join("") + `<option value="previous" ${s.assign?.mode === "previous" ? "selected" : ""}>Önceki aşamayı yapan kişi</option><option value="creator" ${s.assign?.mode === "creator" ? "selected" : ""}>İşi açan kişi</option>`;
  openSheet("step", `<form data-form="step" data-i="${i}" style="display:grid;gap:14px" novalidate>
    <div class="field"><label for="st-name">Aşamanın adı</label><input id="st-name" class="in" value="${esc(s.name)}" autocomplete="off"></div>
    <div class="field"><label for="st-kind">Türü</label><select id="st-kind" class="in">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${v.n} · ${v.d}</option>`).join("")}</select></div>
    <div class="field"><label for="st-own">Kim yapar</label><select id="st-own" class="in">${deptOpts}</select><p class="small muted">Departmandan en az işi olana düşer; izinli olan atlanır.</p></div>
    ${s.kind === "decision" ? `<div class="grid2"><div class="field"><label for="st-yes">Evet seçeneği</label><input id="st-yes" class="in" value="${esc(s.yes || "Uygun")}"></div><div class="field"><label for="st-no">Hayır seçeneği</label><input id="st-no" class="in" value="${esc(s.no || "Uygun değil")}"></div></div>
      <div class="field"><label for="st-back">Hayır olunca dönülecek aşama</label><select id="st-back" class="in">${prev.map(p => `<option value="${p.key}" ${s.back === p.key ? "selected" : ""}>${esc(p.name)}</option>`).join("") || `<option value="">Önce bir aşama ekle</option>`}</select></div>` : ""}
    ${s.kind === "timer" ? `<div class="field"><label for="st-timer">Bekleme süresi (saat)</label><input id="st-timer" class="in" inputmode="numeric" value="${esc(s.timer || 12)}"></div>` : ""}
    <div class="field"><label for="st-check">Kontrol adımları · her satıra bir tane</label><textarea id="st-check" class="in" placeholder="Ör: Ölçüler kontrol edildi">${esc((s.checklist || []).join("\n"))}</textarea></div>
    <div class="field"><label for="st-sla">Hedef süre (saat, isteğe bağlı)</label><input id="st-sla" class="in" inputmode="numeric" value="${esc(s.sla || "")}"></div>
    <div class="list">
      <div class="set"><div><b id="st-pl">Bitirmek için fotoğraf şart</b></div><button type="button" class="sw" role="switch" aria-checked="${!!s.photo}" aria-labelledby="st-pl" data-a="st-sw" data-k="photo"></button></div>
      ${i && s.kind !== "decision" && FE.steps[i - 1].kind !== "decision" ? `<div class="set"><div><b id="st-par">Öncekiyle aynı anda yürüsün</b><p class="small muted">"${esc(FE.steps[i - 1].name)}" ile paralel</p></div><button type="button" class="sw" role="switch" aria-checked="${!!s.par}" aria-labelledby="st-par" data-a="st-sw" data-k="par"></button></div>` : ""}</div>
    <div class="grid2"><button type="button" class="btn danger" data-a="st-del" data-i="${i}">${ic("trash")}Sil</button><button class="btn ok" type="submit">Tamam</button></div></form>`, { title: s.name || "Yeni aşama", eyebrow: `${i + 1}. aşama`, focus: "#st-name" });
}
