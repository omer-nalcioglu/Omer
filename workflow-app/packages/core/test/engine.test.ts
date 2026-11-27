import { describe, expect, it } from "vitest";
import {
  KLIMA_FLOW, METAL_FLOW, QUICK_TASK_FLOW, blockers, cancelJob, completeStage, createJob, documentTotals, fireTimer, formatTL, holdJob,
  progress, reportIssue, resolveIssue, resumeJob, sendBack, startStage, tl, toggleCheck, addPhoto, validateFlow, type Ctx, type FlowDef, type Job,
} from "../src/index.ts";

const ctx = (by = "selim", now = 1_000_000): Ctx => ({ now, by });
const st = (j: Job) => Object.fromEntries(Object.entries(j.stages).map(([k, r]) => [k, r.status]));
const newMetal = () => createJob(METAL_FLOW, { id: "j1", businessId: "b1", number: 1042, title: "Konstrüksiyon", due: 2_000_000, amount: tl(186000) }, ctx());
const tickAll = (j: Job, k: string) => { let x = j; j.stages[k]!.checks.forEach((_, i) => { x = toggleCheck(x, k, i); }); return x; };
const done = (j: Job, flow: FlowDef, k: string, o: { choice?: string; data?: Record<string, string> } = {}) => completeStage(tickAll(j, k), flow, k, ctx("u"), o).job;

describe("akış doğrulama", () => {
  it("hazır akışlar geçerli", () => {
    for (const f of [METAL_FLOW, KLIMA_FLOW, QUICK_TASK_FLOW]) expect(validateFlow(f)).toEqual([]);
  });
  it("kopuk kenar ve tek dallı karar yakalanır", () => {
    const bad: FlowDef = { ...QUICK_TASK_FLOW, stages: [
      { key: "a", name: "A", kind: "decision", next: [], assign: { mode: "creator" }, branches: [{ id: "x", label: "X", to: "yok" }] },
    ] };
    const e = validateFlow(bad);
    expect(e.join(" ")).toMatch(/bağlı olduğu aşama yok/);
    expect(e.join(" ")).toMatch(/en az iki dal/);
  });
});

describe("motor", () => {
  it("iş açılınca başlangıç aşaması hazır, kural olayı üretilir", () => {
    const { job, events } = newMetal();
    expect(st(job).olcum).toBe("ready");
    expect(events.map(e => e.type)).toEqual(["job.created", "notify", "stage.ready"]);
  });

  it("karar: Uygun → kesim; seçilmeyen dal atlanır; paralel iki aşama birlikte açılır ve birleşir", () => {
    let j = newMetal().job;
    j = done(j, METAL_FLOW, "olcum");
    expect(st(j).kontrol).toBe("ready");
    expect(blockers(j, METAL_FLOW, "kontrol")).toContain("Bir seçenek seçilmeli");
    j = done(j, METAL_FLOW, "kontrol", { choice: "evet" });
    expect(st(j).revize).toBe("skipped");
    expect(st(j).kesim).toBe("ready");
    j = done(j, METAL_FLOW, "kesim");
    expect([st(j).kaynak, st(j).aksesuar]).toEqual(["ready", "ready"]);
    j = addPhoto(j, "kaynak");
    j = done(j, METAL_FLOW, "kaynak");
    expect(st(j).boya).toBe("locked");
    j = done(j, METAL_FLOW, "aksesuar");
    expect(st(j).boya).toBe("ready");
  });

  it("karar: Müşteriye dön → revize → ölçü yeniden açılır (döngü)", () => {
    let j = newMetal().job;
    j = done(j, METAL_FLOW, "olcum");
    j = done(j, METAL_FLOW, "kontrol", { choice: "hayir" });
    expect(st(j).revize).toBe("ready");
    expect(st(j).kesim).toBe("locked"); // döngüden yine ulaşılabilir, atlanmaz
    j = done(j, METAL_FLOW, "revize");
    expect(st(j).olcum).toBe("ready");
    expect(j.stages.olcum!.visits).toBe(2);
    expect(st(j).kesim).toBe("locked");
    j = done(j, METAL_FLOW, "olcum");
    j = done(j, METAL_FLOW, "kontrol", { choice: "evet" });
    expect(st(j).kesim).toBe("ready");
  });

  it("fotoğraf, kontrol adımı ve aşamada zorunlu alan bitirmeyi engeller", () => {
    let j = newMetal().job;
    j = done(j, METAL_FLOW, "olcum"); j = done(j, METAL_FLOW, "kontrol", { choice: "evet" }); j = done(j, METAL_FLOW, "kesim");
    expect(() => completeStage(j, METAL_FLOW, "kaynak", ctx())).toThrow(/Fotoğraf/);
    j = addPhoto(j, "kaynak"); j = done(j, METAL_FLOW, "kaynak"); j = done(j, METAL_FLOW, "aksesuar");
    expect(() => completeStage(j, METAL_FLOW, "boya", ctx())).toThrow(/Boya rengi gerekli/);
    j = done(j, METAL_FLOW, "boya", { data: { renk: "Antrasit" } });
    expect(j.data.renk).toBe("Antrasit");
    expect(st(j).kuruma).toBe("working");
  });

  it("zamanlayıcı, fatura ve tahsilat olayları; iş kapanır", () => {
    let j = newMetal().job;
    j = done(j, METAL_FLOW, "olcum"); j = done(j, METAL_FLOW, "kontrol", { choice: "evet" }); j = done(j, METAL_FLOW, "kesim");
    j = addPhoto(j, "kaynak"); j = done(j, METAL_FLOW, "kaynak"); j = done(j, METAL_FLOW, "aksesuar");
    j = done(j, METAL_FLOW, "boya", { data: { renk: "Siyah" } });
    const t = fireTimer(j, METAL_FLOW, "kuruma", ctx("x", 5_000_000)); j = t.job;
    expect(st(j).kalite).toBe("ready");
    j = done(j, METAL_FLOW, "kalite");
    const d = completeStage(j, METAL_FLOW, "teslim", ctx()); j = d.job;
    expect(d.events.map(e => e.type)).toContain("invoice.requested");
    const f = completeStage(j, METAL_FLOW, "fatura", ctx()); j = f.job;
    expect(f.events.map(e => e.type)).toContain("payment.requested");
    const p = completeStage(j, METAL_FLOW, "tahsilat", ctx()); j = p.job;
    expect(j.status).toBe("done");
    expect(p.events.at(-1)?.type).toBe("job.completed");
    expect(progress(j)).toBe(100);
  });

  it("geri gönder: hedef ve sonrası yeniden açılır", () => {
    let j = newMetal().job;
    j = done(j, METAL_FLOW, "olcum"); j = done(j, METAL_FLOW, "kontrol", { choice: "evet" }); j = done(j, METAL_FLOW, "kesim");
    const r = sendBack(j, METAL_FLOW, "kaynak", "kesim", "ölçü hatalı", ctx());
    expect(st(r.job).kesim).toBe("ready");
    expect(st(r.job).kaynak).toBe("locked");
    expect(() => sendBack(r.job, METAL_FLOW, "kesim", "kalite", "x", ctx())).toThrow(/önceki/);
  });

  it("sorun bildir / çöz, beklet / devam, iptal", () => {
    let j = newMetal().job;
    j = startStage(j, METAL_FLOW, "olcum", ctx("murat")).job;
    expect(j.stages.olcum!.owner).toBe("murat");
    j = reportIssue(j, METAL_FLOW, "olcum", "Malzeme eksik", "sac yok", ctx()).job;
    expect(st(j).olcum).toBe("blocked");
    j = resolveIssue(j, "olcum", ctx()).job;
    expect(st(j).olcum).toBe("working");
    j = holdJob(j, "ödeme yok", ctx()).job;
    expect(() => startStage(j, METAL_FLOW, "olcum", ctx())).toThrow(/açık değil/);
    j = resumeJob(j, ctx()).job;
    j = cancelJob(j, "müşteri vazgeçti", ctx()).job;
    expect(j.status).toBe("cancelled");
  });

  it("klima: iş açarken zorunlu alan; 'önceki kişi' ataması; otomatik bilgi adımı geçer", () => {
    expect(() => createJob(KLIMA_FLOW, { id: "k", businessId: "b", number: 1, title: "Salon", due: 0 }, ctx())).toThrow(/BTU gerekli/);
    let j = createJob(KLIMA_FLOW, { id: "k", businessId: "b", number: 1, title: "Salon", due: 0, data: { btu: "12000" } }, ctx()).job;
    j = startStage(j, KLIMA_FLOW, "randevu", ctx("emre")).job;
    j = completeStage(j, KLIMA_FLOW, "randevu", ctx("emre")).job;
    expect(j.stages.montaj!.owner).toBe("emre");
    j = addPhoto(tickAll(j, "montaj"), "montaj");
    j = completeStage(j, KLIMA_FLOW, "montaj", ctx("emre")).job;
    const r = completeStage(j, KLIMA_FLOW, "onay", ctx("emre"));
    expect(r.events.map(e => e.type)).toEqual(expect.arrayContaining(["message.requested", "invoice.requested"]));
    expect(st(r.job).bilgi).toBe("done");
    expect(st(r.job).fatura).toBe("ready");
  });
});

describe("para", () => {
  it("KDV ve toplamlar kuruş hassasiyetinde", () => {
    const t = documentTotals([{ qty: 3, unitPrice: tl(1250.5), vatRate: 20 }, { qty: 1, unitPrice: tl(99.99), vatRate: 10, discountPercent: 10 }]);
    expect(t.net).toBe(375150 + 8999);
    expect(t.vat).toBe(75030 + 900);
    expect(formatTL(t.total)).toBe("4.600,79 ₺");
  });
});
