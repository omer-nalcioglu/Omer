/* ---------- akış şablonları (kullanıcı modeli) ---------- */
const D = dept => ({ mode: "dept", dept });
const MODELS = {
  metal: { id: "metal", name: "Metal imalat", icon: "flow", fields: [
      { key: "renk", label: "Boya rengi", type: "select", options: ["Antrasit", "Siyah", "Beyaz", "Galvaniz"], requiredAt: "boya" },
      { key: "olcu", label: "Ölçü notu", type: "text" }],
    steps: [
      { key: "olcum", name: "Keşif ve ölçü", kind: "appointment", assign: D("olcum"), checklist: ["Ölçüler alındı", "Yerinde fotoğraf çekildi"], sla: 4 },
      { key: "kontrol", name: "Ölçü uygun mu?", kind: "decision", assign: D("olcum"), yes: "Uygun", no: "Müşteriye dön, yeniden ölç", back: "olcum" },
      { key: "kesim", name: "Kesim", kind: "task", assign: D("uretim"), sla: 6 },
      { key: "kaynak", name: "Kaynak", kind: "task", assign: D("kaynak"), photo: true, sla: 7 },
      { key: "aksesuar", name: "Aksesuar hazırlığı", kind: "task", assign: D("depo"), par: true },
      { key: "boya", name: "Boya", kind: "task", assign: D("boya"), sla: 6 },
      { key: "kuruma", name: "Boya kuruması", kind: "timer", assign: D("boya"), timer: 12 },
      { key: "kalite", name: "Kalite kontrol", kind: "approval", assign: D("kalite"), checklist: ["Ölçü toleransta", "Kaynak dikişleri temiz", "Boya homojen"] },
      { key: "bilgi", name: "Müşteriye hazır bilgisi", kind: "notify", assign: D("yonetim"), pub: "Siparişiniz hazır" },
      { key: "teslim", name: "Teslimat", kind: "delivery", assign: D("sofor") },
      { key: "fatura", name: "Fatura", kind: "invoice", assign: D("muhasebe") },
      { key: "tahsilat", name: "Tahsilat", kind: "payment", assign: D("muhasebe") },
    ] },
  servis: { id: "servis", name: "Montaj ve servis", icon: "truck", fields: [
      { key: "cihaz", label: "Cihaz / model", type: "text", requiredAt: "create" },
      { key: "adres", label: "Adres", type: "text" }],
    steps: [
      { key: "randevu", name: "Randevu ve keşif", kind: "appointment", assign: D("montaj") },
      { key: "montaj", name: "Montaj", kind: "task", assign: { mode: "previous" }, photo: true, checklist: ["Cihaz sabitlendi", "Test çalıştırması yapıldı", "Alan temizlendi"] },
      { key: "onay", name: "Müşteri onayı", kind: "delivery", assign: { mode: "previous" } },
      { key: "fatura", name: "Fatura", kind: "invoice", assign: D("muhasebe") },
    ] },
  genel: { id: "genel", name: "Genel iş", icon: "list", fields: [],
    steps: [
      { key: "hazirlik", name: "Hazırlık", kind: "task", assign: D("uretim") },
      { key: "is", name: "İşin yapılması", kind: "task", assign: { mode: "previous" } },
      { key: "kontrol", name: "Kontrol", kind: "approval", assign: D("yonetim") },
    ] },
};
const TASK_FLOW = () => ({ ...WF.QUICK_TASK_FLOW, stages: [{ ...WF.QUICK_TASK_FLOW.stages[0], assign: { mode: "creator" } }] });

function seedDemo() {
  S = fresh();
  S.phase = "app"; S.biz = { name: "Demirtaş Metal", sector: "uretim" }; S.me = "selim";
  S.people = [
    { id: "selim", name: "Selim Demirtaş", title: "Patron", group: "patron", depts: ["yonetim"], phone: "0532 410 20 30" },
    { id: "kadir", name: "Kadir Öztürk", title: "Ustabaşı", group: "ustabasi", depts: ["kalite"], phone: "0533 220 14 55" },
    { id: "murat", name: "Murat Kaya", title: "Keşif ve ölçü", group: "calisan", depts: ["olcum"] },
    { id: "emre", name: "Emre Yıldız", title: "Kesim ve montaj", group: "calisan", depts: ["uretim", "montaj"] },
    { id: "huseyin", name: "Hüseyin Arslan", title: "Kaynak ustası", group: "calisan", depts: ["kaynak"] },
    { id: "okan", name: "Okan Yalçın", title: "Kaynak", group: "calisan", depts: ["kaynak", "uretim"] },
    { id: "cem", name: "Cem Yavuz", title: "Boyacı", group: "calisan", depts: ["boya"] },
    { id: "yusuf", name: "Yusuf Ekinci", title: "Depo", group: "calisan", depts: ["depo"] },
    { id: "mehmet", name: "Mehmet Doğan", title: "Şoför", group: "sofor", depts: ["sofor"] },
    { id: "ayse", name: "Ayşe Tunç", title: "Muhasebe", group: "yonetici", depts: ["muhasebe"] },
  ];
  S.flows = { metal: toFlow(MODELS.metal), servis: toFlow(MODELS.servis), _task: TASK_FLOW() };
  S.customers = [
    { id: "c1", name: "Kaya İnşaat", contact: "Levent Kaya", phone: "0216 555 10 20" },
    { id: "c2", name: "Yıldız Sitesi Yönetimi", contact: "Aysel Hanım", phone: "0532 600 11 22" },
    { id: "c3", name: "Öztürk Makine", contact: "Barış Öztürk", phone: "0262 333 44 55" },
    { id: "c4", name: "Defne Aksoy", contact: "", phone: "0541 222 33 44" },
    { id: "c5", name: "Can Erdem", contact: "", phone: "0505 111 22 33" },
  ];
  const now = Date.now();
  const at = (by, agoMs) => ({ now: now - agoMs, by, resolve: resolver });
  const add = (flowId, title, customerName, dueIn, extra = {}, agoMs = 5 * DAY) => {
    const r = WF.createJob(S.flows[flowId], { id: "d" + S.nextNo, businessId: "local", number: S.nextNo++, title, customerName, due: atHour(dueIn), ...extra }, at("selim", agoMs));
    S.jobs.unshift(r.job); onEvents(r.events, r.job); sysMsg(r.job, "Selim işi açtı", now - agoMs); return r.job.id;
  };
  const step = (id, k, by, agoMs, o = {}) => {
    let j = jobById(id); j.stages[k].checks = j.stages[k].checks.map(() => true);
    if (stageDef(j, k).photoRequired && !j.stages[k].photos) j.stages[k].photos = 1;
    const r = WF.completeStage(j, flowOf(j), k, at(by, agoMs), o); S.jobs[S.jobs.findIndex(x => x.id === id)] = r.job; onEvents(r.events, r.job);
  };
  const begin = (id, k, by, agoMs) => { const j = jobById(id); const r = WF.startStage(j, flowOf(j), k, at(by, agoMs)); S.jobs[S.jobs.findIndex(x => x.id === id)] = r.job; };

  const a = add("metal", "Metal konstrüksiyon · 24 profil", "Kaya İnşaat", 3, { amount: WF.tl(186000), qty: 24, unit: "profil", customerId: "c1" });
  step(a, "olcum", "murat", 4 * DAY); step(a, "kontrol", "murat", 4 * DAY - HOUR, { choice: "evet" }); step(a, "kesim", "emre", 2 * DAY); begin(a, "kaynak", "huseyin", 3 * HOUR);

  const b = add("metal", "Çelik kapı · 12 adet", "Yıldız Sitesi Yönetimi", 1, { amount: WF.tl(228000), qty: 12, customerId: "c2" }, 7 * DAY);
  step(b, "olcum", "murat", 6 * DAY); step(b, "kontrol", "murat", 6 * DAY, { choice: "evet" }); step(b, "kesim", "emre", 5 * DAY); step(b, "kaynak", "okan", 3 * DAY);
  step(b, "aksesuar", "yusuf", 3 * DAY); step(b, "boya", "cem", 2 * DAY, { data: { renk: "Antrasit" } }); step(b, "kuruma", "cem", DAY);

  const c = add("metal", "Makine parçası · flanş", "Öztürk Makine", 5, { urgent: true, amount: WF.tl(64000), qty: 40, customerId: "c3" }, 3 * DAY);
  step(c, "olcum", "murat", 2 * DAY); step(c, "kontrol", "murat", 2 * DAY, { choice: "evet" });

  const d = add("metal", "Merdiven korkuluğu · 14 m", "Defne Aksoy", -1, { amount: WF.tl(52000), qty: 14, unit: "m", customerId: "c4" }, 6 * DAY);
  step(d, "olcum", "murat", 3 * HOUR);

  const e = add("metal", "Bahçe kapısı", "Can Erdem", 6, { amount: WF.tl(38000), customerId: "c5" }, 2 * DAY);
  step(e, "olcum", "murat", DAY); step(e, "kontrol", "murat", DAY, { choice: "evet" });
  { const j = jobById(e); const r = WF.reportIssue(j, flowOf(j), "kesim", "Malzeme eksik", "40x40 profil stokta yok, tedarikçi cumartesi diyor", at("emre", 5 * HOUR)); S.jobs[S.jobs.findIndex(x => x.id === e)] = r.job; onEvents(r.events, r.job); }

  add("servis", "Yazlık klima montajı", "Can Erdem", 2, { data: { cihaz: "Daikin 12000 BTU", adres: "Beykoz" }, amount: WF.tl(42000), customerId: "c5" }, DAY);

  const t = WF.createJob(S.flows._task, { id: "dtask", businessId: "local", number: S.nextNo++, title: "Kaya İnşaat'a numune götür", due: atHour(0, 16), data: { not: "Profil numunesi depoda, mavi kasada." } }, { ...at("selim", 2 * HOUR), resolve: () => ({ owner: "mehmet", crew: ["mehmet"] }) });
  S.jobs.unshift(t.job); onEvents(t.events, t.job);

  S.threads.push(
    { id: "team", kind: "team", title: "Ekip", members: [], read: {}, msgs: [
      { id: uid(), by: "kadir", at: now - 26 * HOUR, kind: "text", text: "Yarın 08:30'da kısa iş güvenliği toplantısı, atölye 1." },
      { id: uid(), by: "cem", at: now - 20 * HOUR, kind: "text", text: "Antrasit boya bitmek üzere, 2 kova kaldı." },
      { id: uid(), by: "yusuf", at: now - 3 * HOUR, kind: "text", text: "Antrasit siparişi verildi, perşembe gelir." }] },
    { id: "dm-kadir", kind: "dm", members: ["selim", "kadir"], read: {}, msgs: [
      { id: uid(), by: "kadir", at: now - 50 * 60000, kind: "text", text: "Bahçe kapısında profil yok, Emre'yi flanşa kaydırayım mı?" }] });
  const tj = threadFor(jobById(a));
  tj.msgs.push({ id: uid(), by: "kadir", at: now - 2 * HOUR, kind: "text", text: "@Hüseyin profiller 2 numaralı tezgâhta. 3 numaralı birleşime dikkat, 45 derece." },
    { id: uid(), by: "huseyin", at: now - 100 * 60000, kind: "text", text: "Tamam usta, öğleden önce başlıyorum." });
  S.notices.forEach(n => { n.read = n.at < now - 6 * HOUR; });
}

function seedNew({ me, biz, sector, method }) {
  S = fresh();
  S.phase = "app"; S.me = "u1"; S.biz = { name: biz, sector };
  S.people = [{ id: "u1", name: me, title: "İşletme sahibi", group: "patron", depts: ["yonetim", "uretim", "montaj", "olcum", "kaynak", "boya", "kalite", "depo", "sofor", "muhasebe"], login: method }];
  const m = sector === "servis" ? MODELS.servis : sector === "uretim" ? MODELS.metal : MODELS.genel;
  S.flows = { [m.id]: toFlow(JSON.parse(JSON.stringify(m))), _task: TASK_FLOW() };
  S.threads.push({ id: "team", kind: "team", title: "Ekip", members: [], read: {}, msgs: [] });
  S.setup = { team: false, job: false, flow: false };
}
