/* ---------- akıllı ekleme: tek cümleden görev ya da iş ----------
   "Murat yarın 10'da Kaya İnşaat'a numune götürsün, acil"
   → kime: Murat · ne zaman: yarın 10:00 · müşteri: Kaya İnşaat · acil · başlık: Kaya İnşaat'a numune götürsün */
const WEEK = ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"];
function parseSmart(text) {
  const raw = text.trim(), n = " " + trn(raw) + " ", cut = [];
  const out = { who: [], dueDay: null, hour: null, minute: 0, urgent: false, customer: null, flowId: null, title: "" };
  for (const p of S.people) {
    const f = trn(p.name.split(" ")[0]);
    const re = new RegExp(`(^|[\\s,])(${f})(['’]?[a-zçğıöşü]{0,4})?(?=[\\s,.!]|$)`, "i");
    const m = n.match(re); if (m && p.id !== S.me) { out.who.push(p.id); cut.push(m[2] + (m[3] || "")); }
  }
  if (/\bacil\b/.test(n)) { out.urgent = true; cut.push("acil"); }
  const rel = [[/\bbugun\b/, 0, "bugun"], [/\byarin\b/, 1, "yarin"], [/\b(obur|ertesi) gun\b/, 2, null], [/\bhaftaya\b/, 7, "haftaya"]];
  for (const [re, d] of rel) { const m = n.match(re); if (m) { out.dueDay = d; cut.push(m[0]); break; } }
  if (out.dueDay == null) { const m = n.match(/\b(\d{1,2}) gun (sonra|icinde)\b/); if (m) { out.dueDay = +m[1]; cut.push(m[0]); } }
  if (out.dueDay == null) WEEK.forEach((w, i) => { if (out.dueDay == null) { const m = n.match(new RegExp(`\\b${w}(ye|ya|a|e|gunu)?\\b`)); if (m) { out.dueDay = ((i - new Date().getDay() + 7) % 7) || 7; cut.push(m[0]); } } });
  if (/\bbu hafta\b/.test(n) && out.dueDay == null) { out.dueDay = Math.max(1, 5 - new Date().getDay()); cut.push("bu hafta"); }
  let m = n.match(/\b(\d{1,2})[:.](\d{2})(['’]?(da|de|ta|te))?\b/);
  if (m && +m[1] < 24) { out.hour = +m[1]; out.minute = +m[2]; cut.push(m[0]); }
  else { m = n.match(/\b(saat )?(\d{1,2})['’]?(da|de|ta|te)\b/); if (m && +m[2] < 24) { out.hour = +m[2]; cut.push(m[0]); } }
  for (const c of S.customers) { const k = trn(c.name.split(" ")[0]); if (k.length >= 3 && n.includes(" " + k)) { out.customer = c; break; } }
  const flowHints = [["servis", /\b(klima|montaj|servis|kombi|tamir|bakim)\b/], ["metal", /\b(kapi|korkuluk|konstruksiyon|imalat|uretim|profil|flans|sac)\b/]];
  for (const [id, re] of flowHints) if (S.flows[id] && re.test(n)) { out.flowId = id; break; }
  // başlık: çıkarılan parçalar silinir, ilk harf büyür
  let t = " " + raw + " ";
  for (const c of cut) { const re = new RegExp(`(^|[\\s,])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/i/g, "[iıİI]").replace(/u/g, "[uü]").replace(/o/g, "[oö]").replace(/c/g, "[cç]").replace(/s/g, "[sş]").replace(/g/g, "[gğ]")}(?=[\\s,.!]|$)`, "i"); t = t.replace(re, "$1"); }
  t = t.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "").replace(/\s+,/g, ",");
  out.title = t ? t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1) : "";
  out.due = out.dueDay == null && out.hour == null ? null : atHour(out.dueDay ?? 0, out.hour ?? 17, out.minute);
  out.kind = out.flowId && out.customer ? "job" : "task";
  return out;
}

/* ---------- öneriler: sistem sorunu görür, çözümü önerir, tek dokunuşla uygular ---------- */
function suggestions() {
  const out = [], seen = new Set(S.dismissed || []);
  // 1) yük dengesi: aynı departmanda biri dolu, biri boş
  const workers = S.people.filter(p => !isMgr(p.id) && p.joined !== false);
  for (const busy of workers) {
    const mine = myWork(busy.id).filter(x => x.r.status === "ready" && !isTask(x.j));
    if (loadOf(busy.id) < 2 || !mine.length) continue;
    for (const x of mine) {
      const dept = x.s.assign?.dept;
      const idle = workers.find(p => p.id !== busy.id && (p.depts || []).includes(dept) && loadOf(p.id) === 0);
      if (!idle) continue;
      const id = `load:${x.j.id}:${x.s.key}:${idle.id}`;
      if (!seen.has(id)) out.push({ id, tone: "acc", ic: "users", title: `${first(busy.id)}'in önünde ${loadOf(busy.id)} iş var, ${first(idle.id)} boşta`, body: `${x.s.name} · ${x.j.title} işini ${first(idle.id)}'a verirsen ${dayLabel(x.j.due)} termini rahatlar.`, apply: { label: `${first(idle.id)}'a ver`, do: () => cmd.reassign(x.j.id, x.s.key, idle.id), msg: `${x.s.name} ${first(idle.id)}'a verildi` } });
      break;
    }
  }
  // 2) termin riski: termin 24 saat içinde ya da geçmiş, ilerleme düşük
  for (const j of openJobs()) {
    if (isTask(j) || j.status !== "open") continue;
    const pct = WF.progress(j), left = j.due - Date.now();
    if ((left < DAY && pct < 70) || left < 0) {
      const id = `risk:${j.id}`;
      if (seen.has(id) || j.urgent) continue;
      out.push({ id, tone: "bad", ic: "alert", title: left < 0 ? `${j.title} termini geçti` : `${j.title} termine yetişmeyebilir`, body: `İş %${pct} bitti, termin ${when(j.due)}. Acil işaretlersen ekibin listesinde en üste çıkar.`,
        apply: { label: "Acil işaretle", do: () => { j.urgent = true; j.log.push({ at: Date.now(), by: S.me, text: "Acil işaretlendi" }); active(j).forEach(s => j.stages[s.key].owner && notify(j.stages[s.key].owner, `${j.title} acil işaretlendi`, j.id)); }, msg: "Acil işaretlendi" },
        alt: { label: "Müşteriye haber ver", do: () => sysMsg(j, `Müşteriye mesaj gitti: "${j.title} için yeni tahmini teslim ${dayLabel(j.due + 2 * DAY)}" (deneme)`), msg: "Müşteriye haber verildi" } });
    }
  }
  // 3) bekleyen onay: 2 saatten uzun
  for (const j of openJobs()) for (const s of waitingApproval(j)) {
    const r = j.stages[s.key], id = `wait:${j.id}:${s.key}:${r.visits}`;
    if (seen.has(id) || Date.now() - (r.readyAt || 0) < 2 * HOUR || r.owner === S.me) continue;
    out.push({ id, tone: "warn", ic: "clock", title: `${s.name} ${Math.round((Date.now() - r.readyAt) / HOUR)} saattir bekliyor`, body: `${j.title} · onay ${first(r.owner)}'da.`, apply: { label: `${first(r.owner)}'a hatırlat`, do: () => notify(r.owner, `Hatırlatma: ${j.title} · ${s.name} onayını bekliyor`, j.id), msg: `${first(r.owner)}'a hatırlatıldı` } });
  }
  return out.slice(0, 3);
}
