import type { FlowDef, PermissionGroup, StageDef } from "./types.ts";

const S = (key: string, name: string, kind: StageDef["kind"], next: string[], o: Partial<StageDef> = {}): StageDef =>
  ({ key, name, kind, next, assign: { mode: "dept", dept: o.assign?.dept ?? "uretim", ...(o.assign ?? {}) }, ...o });

export const DEFAULT_GROUPS: PermissionGroup[] = [
  { key: "patron", name: "Patron", home: "boss", perms: ["seeAll", "create", "assign", "approve", "money", "flows", "team", "reports"], locked: true },
  { key: "yonetici", name: "Yönetici", home: "boss", perms: ["seeAll", "create", "assign", "approve", "money", "reports"] },
  { key: "ustabasi", name: "Ustabaşı", home: "foreman", perms: ["seeAll", "create", "assign", "approve"] },
  { key: "calisan", name: "Çalışan", home: "worker", perms: [] },
  { key: "sofor", name: "Şoför", home: "driver", perms: [] },
];

/** Üretim + teslimat: karar dalı, paralel aşama, alt iş, fatura ve tahsilat ile. */
export const METAL_FLOW: FlowDef = {
  id: "metal", version: 1, name: "Metal imalat", icon: "factory", start: ["olcum"],
  prefs: { notifyCustomer: true, customerCanSee: true, allowSendBack: true },
  fields: [
    { key: "renk", label: "Boya rengi", type: "select", options: ["Antrasit", "Siyah", "Beyaz", "Galvaniz"], requiredAt: "boya" },
    { key: "olcu_notu", label: "Ölçü notu", type: "text" },
  ],
  rules: [
    { id: "r1", on: "job.created", when: [{ field: "amount", op: "gt", value: 10_000_000 }], then: [{ type: "notify", to: "role:patron", text: "100.000 ₺ üstü iş açıldı" }], enabled: true },
  ],
  stages: [
    S("olcum", "Keşif ve ölçü", "appointment", ["kontrol"], { assign: { mode: "dept", dept: "olcum" }, slaMinutes: 240, checklist: ["Ölçüler alındı", "Fotoğraf çekildi"] }),
    S("kontrol", "Ölçü uygun mu?", "decision", [], { assign: { mode: "dept", dept: "olcum" }, branches: [{ id: "evet", label: "Uygun", to: "kesim" }, { id: "hayir", label: "Müşteriye dön", to: "revize" }] }),
    S("revize", "Müşteriyle revize", "task", ["olcum"], { assign: { mode: "creator" } }),
    S("kesim", "Kesim", "task", ["kaynak", "aksesuar"], { slaMinutes: 360 }),
    S("kaynak", "Kaynak", "task", ["boya"], { assign: { mode: "dept", dept: "kaynak" }, slaMinutes: 420, photoRequired: true }),
    S("aksesuar", "Aksesuar hazırlığı", "task", ["boya"], { assign: { mode: "dept", dept: "depo" } }),
    S("boya", "Boya", "task", ["kuruma"], { assign: { mode: "dept", dept: "boya" } }),
    S("kuruma", "Boya kuruması", "timer", ["kalite"], { assign: { mode: "dept", dept: "boya" }, timerMinutes: 12 * 60 }),
    S("kalite", "Kalite kontrol", "approval", ["teslim"], { assign: { mode: "dept", dept: "kalite" }, checklist: ["Ölçü toleransta", "Boya homojen"] }),
    S("teslim", "Teslimat", "delivery", ["fatura"], { assign: { mode: "dept", dept: "sofor" }, signatureRequired: true }),
    S("fatura", "Fatura", "invoice", ["tahsilat"], { assign: { mode: "dept", dept: "muhasebe" } }),
    S("tahsilat", "Tahsilat", "payment", [], { assign: { mode: "dept", dept: "muhasebe" } }),
  ],
};

/** Saha servisi: randevu, akışa özel alanlar, müşteri onayı. */
export const KLIMA_FLOW: FlowDef = {
  id: "klima", version: 1, name: "Klima montajı", icon: "snow",
  prefs: { notifyCustomer: true, customerCanSee: true, allowSendBack: true },
  fields: [
    { key: "btu", label: "BTU", type: "select", options: ["9000", "12000", "18000", "24000"], requiredAt: "create" },
    { key: "marka", label: "Marka", type: "text" },
    { key: "kat", label: "Kat", type: "number" },
  ],
  rules: [],
  stages: [
    S("randevu", "Keşif randevusu", "appointment", ["montaj"], { assign: { mode: "dept", dept: "montaj" } }),
    S("montaj", "Montaj", "task", ["onay"], { assign: { mode: "previous" }, photoRequired: true, checklist: ["Vakum yapıldı", "Gaz basıncı kontrol edildi", "Alan temizlendi"] }),
    S("onay", "Müşteri onayı", "approval", ["bilgi"], { assign: { mode: "previous" }, signatureRequired: true }),
    S("bilgi", "Müşteriye bilgi", "notify", ["fatura"], { messageTemplate: "is_tamamlandi" }),
    S("fatura", "Fatura", "invoice", [], { assign: { mode: "creator" } }),
  ],
};

/** Tek adımlık görev (akışsız "Görev ver"). */
export const QUICK_TASK_FLOW: FlowDef = {
  id: "_task", version: 1, name: "Görev", icon: "bolt", hidden: true,
  prefs: { notifyCustomer: false, customerCanSee: false, allowSendBack: false },
  fields: [], rules: [],
  stages: [S("gorev", "Görev", "task", [], { assign: { mode: "creator" } })],
};

export const BUILTIN_FLOWS = [METAL_FLOW, KLIMA_FLOW, QUICK_TASK_FLOW];
