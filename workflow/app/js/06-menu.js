/* ---------- MENÜ ---------- */
function viewMenu() {
  const me = person(S.me), boss = home() === "boss";
  const item = (a, i, t, s, extra = "") => `<button class="row" data-a="go" data-v="${a}" ${extra}><span class="ic">${ic(i)}</span><span><span class="t">${t}</span><span class="s">${s}</span></span><span class="chev">${ic("chev")}</span></button>`;
  return `<div class="page enter">${head(esc(S.biz.name), "Menü")}
    <div class="card" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center">${avatar(me)}<div><b>${esc(me.name)}</b><p class="small muted">${esc(groupOf(S.me).name)} · ${esc(me.title)}</p></div></div>
    ${isMgr() ? `<section class="sec" aria-labelledby="h-mg"><h2 id="h-mg">Yönetim</h2><div class="list">
      ${item("team", "users", "Ekip", `${S.people.length} kişi · kimde ne var`)}
      ${item("customers", "user", "Müşteriler", `${S.customers.length} müşteri`)}
      ${can("flows") ? item("flows", "flow", "İş akışları", `${Object.values(S.flows).filter(f => !f.hidden).length} akış · aşamaları düzenle`) : ""}
      ${can("reports") ? item("reports", "chart", "Raporlar", "Zamanında teslim, aşama süreleri") : ""}
    </div></section>` : ""}
    <section class="sec" aria-labelledby="h-me"><h2 id="h-me">Senin için</h2><div class="list">
      ${item("a11y", "eye", "Görünüm ve erişilebilirlik", "Yazı boyutu, kontrast, koyu tema, hareket")}
      ${item("notif", "bell", "Bildirimler", S.prefs.quiet ? "Mesai dışında sessiz" : "Her zaman açık")}
      ${boss ? item("integrations", "link", "Bağlantılar", "e-Fatura, WhatsApp, SMS, ödeme") : ""}
    </div></section>
    <section class="sec" aria-labelledby="h-help"><h2 id="h-help">Prototip</h2><div class="list">${item("why", "spark", "Neden böyle tasarlandı?", "Tasarım kararları ve gerekçeleri")}</div></section>
    <button class="btn line block" data-a="signout">${S.biz.name === "Demirtaş Metal" ? "Örnek işletmeden çık" : "Çıkış yap"}</button>
  </div>`;
}
function sub(title, eyebrow, body) { return `<div class="page enter">${backBtn()}${head(eyebrow, title)}${body}</div>`; }

function viewTeam() {
  return sub("Ekip", `${S.people.length} kişi`, `<div class="list">${S.people.map(p => { const w = myWork(p.id), cur = w.find(x => x.r.status === "working");
    return `<button class="row" data-a="person" data-id="${p.id}">${avatar(p)}<span><span class="t">${esc(p.name)}${p.joined === false ? ' <span class="pill warn">Davet bekliyor</span>' : ""}</span><span class="s">${esc(groupOf(p.id).name)} · ${esc((p.depts || []).map(d => DEPTS[d]).filter(Boolean).slice(0, 3).join(", "))}</span></span><span class="pill ${cur ? "acc" : w.length ? "" : "ok"}">${cur ? "Çalışıyor" : w.length ? `${w.length} iş` : "Boşta"}</span></button>`; }).join("")}</div>
    ${can("team") ? `<button class="btn block" data-a="add-person">${ic("plus")}Çalışan ekle</button>` : ""}`);
}
function viewCustomers() {
  return sub("Müşteriler", `${S.customers.length} müşteri`, S.customers.length ? `<div class="list">${S.customers.map(c => { const js = S.jobs.filter(j => j.customerName === c.name), op = js.filter(j => j.status === "open").length;
    return `<div class="row"><span class="ic">${ic("user")}</span><span><span class="t">${esc(c.name)}</span><span class="s">${esc([c.contact, c.phone].filter(Boolean).join(" · ") || "İletişim bilgisi yok")} · ${op} açık iş</span></span>${can("create") ? `<button class="btn line" style="min-height:40px;padding:6px 12px" data-a="newjob-for" data-id="${c.id}" aria-label="${esc(c.name)} için yeni iş">Yeni iş</button>` : ""}</div>`; }).join("")}</div>` : `<div class="empty">Müşteri yok. İş açarken yazdığın müşteri buraya kendiliğinden eklenir.</div>`);
}
function viewFlows() {
  const fs = Object.values(S.flows).filter(f => !f.hidden);
  return sub("İş akışları", "Aşamalar sırayla ekibe düşer", `<div class="list">${fs.map(f => `<button class="row" data-a="editflow" data-id="${f.id}"><span class="ic">${ic(f.icon || "flow")}</span><span><span class="t">${esc(f.name)}</span><span class="s">${f.stages.length} aşama · sürüm ${f.version} · ${S.jobs.filter(j => j.flowId === f.id && j.status === "open").length} açık iş</span></span><span class="chev">${ic("chev")}</span></button>`).join("")}</div>
    <button class="btn line block" data-a="newflow">${ic("plus")}Yeni akış</button>
    <p class="small muted">Akışı değiştirmek süren işleri bozmaz: süren işler açıldıkları sürümle biter, yeni işler yeni sürümle açılır.</p>`);
}
let FE = null; // akış düzenleme taslağı
function viewFlowEdit() {
  const m = FE, errs = FE._checked ? modelErrors(m) : [];
  const deptOpts = s => Object.entries(DEPTS).map(([k, v]) => `<option value="d:${k}" ${s.assign?.mode === "dept" && s.assign.dept === k ? "selected" : ""}>${v} (${S.people.filter(p => (p.depts || []).includes(k)).length} kişi)</option>`).join("") + `<option value="prev" ${s.assign?.mode === "previous" ? "selected" : ""}>Önceki aşamayı yapan kişi</option><option value="creator" ${s.assign?.mode === "creator" ? "selected" : ""}>İşi açan kişi</option>`;
  const rows = m.steps.map((s, i) => `<li style="display:grid;gap:6px">
    ${s.par && i ? `<p class="xs muted" style="margin-left:2.5rem">${ic("arrow", "s")} öncekiyle aynı anda</p>` : ""}
    <div class="fstep ${s.kind === "decision" ? "dec" : ""}"><span class="k" aria-hidden="true">${i + 1}</span>
      <button style="text-align:left;min-height:44px" data-a="fe-edit" data-i="${i}" aria-label="${i + 1}. aşama ${esc(s.name || "adsız")}, düzenle"><b>${esc(s.name || "Adsız aşama")}</b><span class="xs muted" style="display:block">${KINDS[s.kind].n} · ${s.assign?.mode === "dept" ? DEPTS[s.assign.dept] : s.assign?.mode === "previous" ? "önceki kişi" : "işi açan"}${s.photo ? " · fotoğraf şart" : ""}${s.checklist?.length ? ` · ${s.checklist.length} kontrol` : ""}</span></button>
      <span style="display:flex"><button class="ibtn" data-a="fe-move" data-i="${i}" data-d="-1" ${i ? "" : "disabled"} aria-label="Yukarı taşı">${ic("up")}</button><button class="ibtn" data-a="fe-move" data-i="${i}" data-d="1" ${i < m.steps.length - 1 ? "" : "disabled"} aria-label="Aşağı taşı">${ic("down")}</button></span></div>
    ${s.kind === "decision" ? `<div class="fbranch"><p class="small"><b>${esc(s.yes || "Uygun")}</b> → ${esc(m.steps[i + 1]?.name || "sonraki aşama")}</p><p class="small"><b>${esc(s.no || "Uygun değil")}</b> → ${esc(m.steps.find(x => x.key === s.back)?.name || m.steps[0]?.name || "başa")} aşamasına döner</p></div>` : ""}
  </li>`).join("");
  return `<div class="page enter">${backBtn()}${head(m._new ? "Yeni akış" : `Sürüm ${m.version || 1} · düzenleniyor`, esc(m.name || "Adsız akış"))}
    <div class="field"><label for="fe-name">Akışın adı</label><input id="fe-name" class="in" value="${esc(m.name)}" placeholder="Ör: Kapı imalatı" data-fe="name"></div>
    <section class="sec" aria-labelledby="h-fe"><div class="sec-h"><h2 id="h-fe">Aşamalar</h2><span class="small muted">${m.steps.length} aşama</span></div>
      <ol style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${rows}</ol>
      <button class="btn line block" data-a="fe-add">${ic("plus")}Aşama ekle</button></section>
    <div role="status" aria-live="polite">${FE._checked ? (errs.length ? `<div class="issue"><b>${errs.length} şey düzeltilmeli</b>${errs.map(e => `<span>• ${esc(e)}</span>`).join("")}</div>` : `<div class="note" style="background:var(--ok-soft)"><b>${ic("check", "s")} Akış hazır</b><span>Her aşamaya ulaşılabiliyor ve sahibi belli.</span></div>`) : ""}</div>
    ${FE._sim ? `<section class="card" aria-labelledby="h-sim" style="display:grid;gap:8px"><h2 id="h-sim">Deneme işi</h2><p class="small muted">Kimseye bildirim gitmeden ${FE._sim.choice === "hayir" ? '"hayır" dalı' : "her kararda ilk seçenek"} seçilerek yürütüldü.</p><ol class="small" style="margin:0;padding-left:20px;display:grid;gap:4px">${FE._sim.path.map(x => `<li>${esc(x)}</li>`).join("")}</ol></section>` : ""}
    <div class="grid2"><button class="btn line" data-a="fe-check">Kontrol et</button><button class="btn line" data-a="fe-sim">Deneme işi</button></div>
    <button class="btn ok big block" data-a="fe-save">${m._new ? "Akışı oluştur" : "Yeni sürüm olarak kaydet"}</button>
    <p class="small muted">Kaydedince yeni işler bu sürümle açılır; ${S.jobs.filter(j => j.flowId === m.id && j.status === "open").length} süren iş eski sürümle biter.</p>
  </div>`;
}
function viewReports() {
  const done = S.jobs.filter(j => j.status === "done" && !isTask(j)), onTime = done.filter(j => Math.max(...Object.values(j.stages).map(r => r.doneAt || 0)) <= j.due).length;
  const stats = {};
  for (const j of S.jobs) if (!isTask(j)) for (const s of flowOf(j).stages) { const r = j.stages[s.key]; if (r.status === "done" && r.startedAt && r.doneAt && s.kind !== "timer" && s.kind !== "notify") { const x = (stats[s.name] ??= { n: 0, h: 0, sla: s.slaMinutes ? s.slaMinutes / 60 : null }); x.n++; x.h += (r.doneAt - r.startedAt) / HOUR; } }
  const rows = Object.entries(stats).map(([n, x]) => ({ n, avg: x.h / x.n, sla: x.sla })).sort((a, b) => b.avg - a.avg).slice(0, 6), max = Math.max(1, ...rows.map(r => Math.max(r.avg, r.sla || 0)));
  const per = S.people.map(p => ({ p, n: S.jobs.reduce((a, j) => a + Object.values(j.stages).filter(r => r.status === "done" && r.owner === p.id).length, 0) })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 5);
  return sub("Raporlar", "Bu ay", `
    <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="kpi"><span class="v num">${done.length ? Math.round(onTime / done.length * 100) : "—"}${done.length ? "%" : ""}</span><span class="l">Zamanında teslim (${onTime}/${done.length})</span></div><div class="kpi"><span class="v num">${openJobs().filter(j => !isTask(j)).length}</span><span class="l">Açık iş</span></div></div>
    <section class="sec" aria-labelledby="h-r1"><h2 id="h-r1">Aşama başına ortalama süre</h2><div class="card" style="display:grid;gap:12px">${rows.length ? rows.map(r => `<div style="display:grid;gap:4px"><p class="small" style="display:flex;justify-content:space-between;gap:8px"><b>${esc(r.n)}</b><span class="num ${r.sla && r.avg > r.sla ? "" : "muted"}" style="${r.sla && r.avg > r.sla ? "color:var(--warn);font-weight:700" : ""}">${r.avg.toFixed(1).replace(".", ",")} sa${r.sla ? ` · hedef ${r.sla}` : ""}</span></p><div class="prog" style="position:relative"><i style="width:${r.avg / max * 100}%;${r.sla && r.avg > r.sla ? "background:var(--warn)" : ""}"></i></div></div>`).join("") : `<p class="small muted">Henüz biten aşama yok.</p>`}</div></section>
    <section class="sec" aria-labelledby="h-r2"><h2 id="h-r2">En çok iş bitirenler</h2><div class="list">${per.map(x => `<div class="row">${avatar(x.p)}<span><span class="t">${esc(x.p.name)}</span><span class="s">${esc(x.p.title)}</span></span><b class="num">${x.n}</b></div>`).join("") || `<div class="row"><span></span><span class="s">Henüz veri yok.</span></div>`}</div></section>`);
}
function viewA11y() {
  const p = S.prefs, seg = (k, opts) => `<div class="seg" role="radiogroup" aria-label="${k}">${opts.map(([v, l]) => `<button role="radio" aria-checked="${p[k] === v}" data-a="pref" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  const sw = (k, t, d, on) => `<div class="set"><div><b id="l-${k}">${t}</b><p class="small muted">${d}</p></div><button class="sw" role="switch" aria-checked="${on}" aria-labelledby="l-${k}" data-a="pref-sw" data-k="${k}"></button></div>`;
  return sub("Görünüm ve erişilebilirlik", "Senin telefonuna özel", `
    <section class="sec" aria-labelledby="h-a1"><h2 id="h-a1">Yazı boyutu</h2>${seg("size", [["m", "Normal"], ["l", "Büyük"], ["xl", "Çok büyük"]])}<p class="small muted">Atölyede telefon kol mesafesindeyse "Büyük" önerilir. Telefonun kendi yazı boyutu ayarına da uyar.</p></section>
    <section class="sec" aria-labelledby="h-a2"><h2 id="h-a2">Tema</h2>${seg("theme", [["system", "Telefona göre"], ["light", "Açık"], ["dark", "Koyu"]])}</section>
    <div class="list">${sw("contrast", "Yüksek kontrast", "Gri yazılar siyahlaşır, çerçeveler kalınlaşır; güneş altında okunur.", p.contrast === "high")}${sw("bold", "Kalın yazı", "Tüm yazılar bir kademe kalınlaşır.", !!p.bold)}${sw("motion", "Hareketi azalt", "Geçiş ve canlanma efektleri kapanır.", p.motion === "off")}</div>
    <div class="card" style="display:grid;gap:6px"><b>Bu uygulamada her zaman</b><ul class="small muted" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Dokunma alanları en az 48 piksel; eldivenle de isabet edilir.</li><li>Durumlar yalnız renkle değil, ikon ve yazıyla da anlatılır.</li><li>Ekran okuyucu her düğmenin ne yaptığını söyler; pencereler klavyeyle kapanır.</li><li>Geri alınabilen işlerde onay sorulmaz, 6 saniye "Geri al" çıkar.</li></ul></div>`);
}
function viewNotif() {
  const n = S.prefs.notify, sw = (k, t, d, on, a = "notif-sw") => `<div class="set"><div><b id="n-${k}">${t}</b><p class="small muted">${d}</p></div><button class="sw" role="switch" aria-checked="${on}" aria-labelledby="n-${k}" data-a="${a}" data-k="${k}"></button></div>`;
  return sub("Bildirimler", "Az ama doğru zamanda", `<div class="list">${sw("mine", "Bana iş düşünce", "Bir aşama ya da görev sana geldiğinde.", n.mine)}${sw("issues", "Sorun bildirilince", "Ekipten biri sorun bildirdiğinde (yöneticiler).", n.issues)}${sw("done", "Açtığım iş bitince", "Tamamlanan işler.", n.done)}${sw("chat", "Mesajlar", "Sana yazılan ve seni anan mesajlar.", n.chat)}</div>
    <div class="list">${sw("quiet", "Mesai dışında sessiz", "18:00–08:00 arası yalnız acil sorunlar bildirilir.", S.prefs.quiet, "pref-sw")}${sw("digest", "Akşam özeti", "18:00'de tek bildirim: bugün ne bitti, yarın ne var.", S.prefs.digest, "pref-sw")}</div>`);
}
function viewIntegrations() {
  const I = [["doc", "e-Fatura / e-Arşiv", "Fatura aşaması gelince kendiliğinden kesilir", "Paraşüt, Logo İşbaşı, Uyumsoft"], ["chat", "WhatsApp Business", "Müşteriye aşama bilgisi, gelen mesajlar sohbete düşer", "Meta Cloud API"], ["phone", "SMS", "WhatsApp'ı olmayan müşteriye bilgi", "Netgsm ve benzeri"], ["money", "Online tahsilat", "Tahsilat aşamasında ödeme linki", "iyzico ve benzeri"]];
  return sub("Bağlantılar", "Uygulama dışı sistemler", `<div class="list">${I.map(([i, t, d, p]) => `<div class="row"><span class="ic">${ic(i)}</span><span><span class="t">${t}</span><span class="s">${d} · ${p}</span></span><span class="pill">Bağlı değil</span></div>`).join("")}</div>
    <p class="small muted">Altyapı hazır: sağlayıcı seçilir, anahtar sunucu kasasına kaydedilir, olaylar kendiliğinden gider. Akışlar ve ekranlar değişmez.</p>`);
}
function viewWhy() {
  const W = [
    ["Bugün ekranı", "Patron her şeyi değil, yalnız dikkat gerektireni görür (istisna yönetimi). Özet tek cümle, renk en kötü duruma göre. Çalışan ise sadece sıradaki işini görür; en acil olan en üstte."],
    ["Tek ana düğme", "Her kartta bir büyük eylem var: başla, bitir, onayla. Kapalıysa nedeni altında yazar; kişi neyi eksik bıraktığını tahmin etmek zorunda kalmaz."],
    ["Onay yerine geri al", "Bitirme, atama, acil işaretleme gibi geri alınabilen işlerde \"emin misin?\" sorulmaz; 6 saniye \"Geri al\" çıkar. Yalnız iptal gibi geri dönmeyen işler sorulur. Daha az dokunuş, daha az yorgunluk."],
    ["Akıllı ekleme", "＋ düğmesinde tek satır yeter: \"Murat yarın 10'da Kaya İnşaat'a numune götürsün, acil\". Kişi, zaman, müşteri ve aciliyet çıkarılır, istersen tek tek düzeltirsin."],
    ["Öneriler", "Sistem dolu/boş kişiyi, termin riskini ve bekleyen onayı görür; çözümü önerir ve tek dokunuşla uygular. Karar yine insanda."],
    ["Durum hiçbir zaman yalnız renk değil", "Her durum etiketi ikon + yazı taşır; renk körlüğünde ve güneş altında da okunur. Renkler beyaz ve koyu zeminde en az 4,5:1 kontrastlı."],
    ["Okunaklı ölçüler", "Gövde 17 px, dokunma alanları en az 48 px, kartlar tek sütun. Yazı boyutu, yüksek kontrast, kalın yazı ve hareketi azaltma Menü'de."],
    ["Klavye ve ekran okuyucu", "Her ekran başlığa odaklanarak açılır; pencereler Esc ile kapanır ve odağı geri verir; kontrol adımları gerçek onay kutusu, kararlar radyo grubu olarak okunur; bildirimler sesli duyurulur."],
    ["İnternetsiz çalışma", "Prototip çubuğundan \"İnternet yok\" açılabilir: iş durmaz, değişiklikler sıraya girer, bağlantı gelince gider. Atölye ve şantiye için."],
    ["Akış tasarlayıcısı", "Aşamalar sıralı liste olarak dizilir; kutu-ok çizmek gerekmez. Karar aşaması \"hayır\" dalında önceki bir aşamaya döner. Kaydetmeden önce kontrol ve deneme işi var; süren işler eski sürümle biter."],
  ];
  return sub("Neden böyle tasarlandı?", "Tasarım kararları", `<div class="list">${W.map(([t, d], i) => `<div class="row" style="align-items:start"><span class="ic">${i + 1}</span><span><span class="t">${esc(t)}</span><span class="s">${esc(d)}</span></span><span></span></div>`).join("")}</div>`);
}

/* ---------- AÇILIŞ ---------- */
function viewWelcome() {
  return `<div class="page enter" style="padding-top:48px;gap:24px">
    <div style="display:grid;gap:16px"><span class="ic" style="width:64px;height:64px;border-radius:20px;background:var(--accent);color:var(--on-accent);box-shadow:var(--lift)">${ic("flow", "l")}</span>
      <h1 tabindex="-1" style="font-size:var(--t-3xl)">Workflow</h1>
      <p style="font-size:var(--t-lg);color:var(--ink-2)">İş kimde, hangi aşamada, ne zaman biter? Ekibine iş ver; biri işini bitirince sıradakine kendiliğinden geçsin.</p></div>
    <div style="display:grid;gap:10px">
      <button class="btn big block" data-a="demo">${ic("eye")}Örnek işletmeyi gez</button>
      <p class="small muted" style="text-align:center">10 kişilik bir metal atölyesi. Üstteki menüden patron, usta ya da şoför gözüyle bakabilirsin.</p></div>
    <div style="display:grid;gap:10px"><p class="lbl" style="text-align:center">Kendi işletmeni kur</p>
      <button class="btn line block" data-a="login" data-v="Apple">${ic("user")}Apple ile devam et</button>
      <button class="btn line block" data-a="login" data-v="Google">${ic("user")}Google ile devam et</button>
      <button class="btn line block" data-a="login" data-v="E-posta">${ic("send")}E-posta ile devam et</button>
      <p class="xs muted" style="text-align:center">Prototipte giriş yapılmaz; bir sonraki adıma geçer.</p></div>
  </div>`;
}
function viewSetup() {
  const v = R.setup || (R.setup = { me: "", biz: "", sector: "" });
  const S3 = [["uretim", "Üretim, atölye", "Sipariş → üretim → teslim"], ["servis", "Montaj, servis", "Randevu → montaj → onay"], ["genel", "Başka bir iş", "Hazırlık → iş → kontrol"]];
  return `<div class="page enter" style="padding-top:32px"><button class="back" data-a="welcome">${ic("back")}Geri</button>
    ${head(`${esc(R.login || "")} ile giriş · 1 adım`, "İşletmeni tanıyalım")}
    <form data-form="setup" style="display:grid;gap:18px" novalidate>
      <div class="field"><label for="su-me">Adın soyadın</label><input id="su-me" class="in" value="${esc(v.me)}" autocomplete="name" placeholder="Ör: Ayten Yılmaz" required></div>
      <div class="field"><label for="su-biz">İşletmenin adı</label><input id="su-biz" class="in" value="${esc(v.biz)}" autocomplete="organization" placeholder="Ör: Yılmaz Klima" required></div>
      <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lbl" style="margin-bottom:8px">Ne iş yapıyorsunuz?</legend>
        <div role="radiogroup" aria-label="İş türü" class="list">${S3.map(([k, t, d]) => `<button type="button" class="row" role="radio" aria-checked="${v.sector === k}" data-a="sector" data-v="${k}"><span class="ic ${v.sector === k ? "" : ""}" style="${v.sector === k ? "background:var(--accent);color:var(--on-accent)" : ""}">${ic(v.sector === k ? "check" : "flow")}</span><span><span class="t">${t}</span><span class="s">${d}</span></span><span></span></button>`).join("")}</div>
        <p class="small muted">Hazır bir iş akışıyla başlarsın; aşamaları sonra değiştirebilirsin.</p></fieldset>
      <p class="hint bad" id="su-err" role="alert"></p>
      <button class="btn big block" type="submit">Başla</button>
    </form></div>`;
}
