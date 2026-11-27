import {
  KLIMA_FLOW, METAL_FLOW, QUICK_TASK_FLOW, addPhoto, completeStage, createJob, startStage, toggleCheck, tl,
  type Ctx, type FlowDef, type Job, type OwnerResolver, type Person,
} from "@workflow/core";
import type { AppState } from "./store";

/** Örnek işletme: 10 kişilik metal atölyesi. İşler motorla gerçekten ilerletilir; elle yazılmış durum yoktur. */
const PEOPLE: Person[] = [
  { id: "selim", name: "Selim Demirtaş", title: "Patron", group: "patron", depts: ["yonetim"] },
  { id: "kadir", name: "Kadir Öztürk", title: "Ustabaşı", group: "ustabasi", depts: ["kalite"] },
  { id: "murat", name: "Murat Kaya", title: "Teknik personel", group: "calisan", depts: ["olcum"] },
  { id: "emre", name: "Emre Yıldız", title: "Kesim ve montaj", group: "calisan", depts: ["uretim", "montaj"] },
  { id: "huseyin", name: "Hüseyin Arslan", title: "Kaynak ustası", group: "calisan", depts: ["kaynak"] },
  { id: "cem", name: "Cem Yavuz", title: "Boyacı", group: "calisan", depts: ["boya"] },
  { id: "yusuf", name: "Yusuf Ekinci", title: "Depo", group: "calisan", depts: ["depo"] },
  { id: "mehmet", name: "Mehmet Doğan", title: "Şoför", group: "sofor", depts: ["sofor"] },
  { id: "ayse", name: "Ayşe Tunç", title: "Muhasebe", group: "yonetici", depts: ["muhasebe"] },
];

const resolve: OwnerResolver = (st, job) => {
  if (st.assign.mode === "person" && st.assign.person) return { owner: st.assign.person, crew: [st.assign.person] };
  if (st.assign.mode === "creator") return { owner: job.createdBy, crew: [job.createdBy] };
  const p = PEOPLE.find(x => x.depts.includes(st.assign.dept ?? "")) ?? PEOPLE[1]!;
  return { owner: p.id, crew: [p.id] };
};

const H = 3_600_000, D = 24 * H;

export function seedDemo(base: AppState): AppState {
  const now = Date.now();
  let n = 1041;
  const c = (by: string, ago: number): Ctx => ({ now: now - ago, by, resolve });
  const make = (flow: FlowDef, title: string, customerName: string, dueIn: number, extra: Partial<Parameters<typeof createJob>[1]> = {}) =>
    createJob(flow, { id: `demo${++n}`, businessId: "local", number: n, title, customerName, due: now + dueIn, ...extra }, c("selim", 5 * D)).job;
  const tick = (j: Job, k: string) => j.stages[k]!.checks.reduce((x, _, i) => toggleCheck(x, k, i), j);
  const done = (j: Job, f: FlowDef, k: string, by: string, ago: number, o: { choice?: string; data?: Record<string, string> } = {}) =>
    completeStage(tick(j, k), f, k, c(by, ago), o).job;

  // #1042: kaynak sürüyor
  let a = make(METAL_FLOW, "Metal konstrüksiyon", "Kaya İnşaat", 2 * D, { amount: tl(186000), qty: 24, unit: "profil" });
  a = done(a, METAL_FLOW, "olcum", "murat", 4 * D); a = done(a, METAL_FLOW, "kontrol", "murat", 4 * D - H, { choice: "evet" });
  a = done(a, METAL_FLOW, "kesim", "emre", 2 * D); a = startStage(a, METAL_FLOW, "kaynak", c("huseyin", 3 * H)).job;

  // #1043: kalite onayı bekliyor
  let b = make(METAL_FLOW, "Çelik kapı siparişi", "Yıldız Sitesi", 1 * D, { amount: tl(228000), qty: 12 });
  b = done(b, METAL_FLOW, "olcum", "murat", 5 * D); b = done(b, METAL_FLOW, "kontrol", "murat", 5 * D, { choice: "evet" });
  b = done(b, METAL_FLOW, "kesim", "emre", 4 * D); b = addPhoto(b, "kaynak"); b = done(b, METAL_FLOW, "kaynak", "huseyin", 3 * D);
  b = done(b, METAL_FLOW, "aksesuar", "yusuf", 3 * D); b = done(b, METAL_FLOW, "boya", "cem", 2 * D, { data: { renk: "Antrasit" } });
  b = { ...b }; b = completeStage(b, METAL_FLOW, "kuruma", c("cem", D)).job;

  // #1044: acil, kesimde
  let d = make(METAL_FLOW, "Makine parçası · flanş", "Öztürk Makine", 4 * D, { urgent: true, amount: tl(64000), qty: 40 });
  d = done(d, METAL_FLOW, "olcum", "murat", 2 * D); d = done(d, METAL_FLOW, "kontrol", "murat", 2 * D, { choice: "evet" });

  // #1045: gecikmiş, ölçü kararı bekliyor
  let e = make(METAL_FLOW, "Merdiven korkuluğu", "Defne Hanım", -1 * D, { amount: tl(52000), qty: 14, unit: "m" });
  e = done(e, METAL_FLOW, "olcum", "murat", 2 * D);

  // #1046: klima montajı, randevu
  const k = make(KLIMA_FLOW, "Salon kliması", "Can Bey", 2 * D, { data: { btu: "12000", marka: "Daikin", kat: 3 }, amount: tl(42000) });

  // hızlı görev
  const t = createJob(QUICK_TASK_FLOW, { id: "demo-task", businessId: "local", number: ++n, title: "Kaya İnşaat'a numune götür", due: now + 6 * H }, { ...c("selim", H), resolve: () => ({ owner: "mehmet", crew: ["mehmet"] }) }).job;

  return { ...base, mode: "demo", businessName: "Demirtaş Metal", me: "selim", people: PEOPLE, jobs: [t, k, e, d, b, a], nextNumber: n + 1 };
}
