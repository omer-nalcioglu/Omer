// Outbox dağıtıcısı. Zamanlanmış olarak (pg_cron, dakikada bir) çağrılır.
// Bekleyen olayları alır, işletmenin aboneliklerine göre sağlayıcı adaptörlerine yollar,
// başarısızlıkta artan beklemeyle yeniden dener; 8 denemeden sonra "dead" olur ve patrona bildirilir.
import { admin, json } from "../_shared/db.ts";
import { invoiceAdapter, messageAdapter, paymentAdapter, type IntegrationRow } from "../_shared/registry.ts";

const MAX_ATTEMPTS = 8;
const backoffMinutes = (n: number) => Math.min(360, 2 ** n);

Deno.serve(async req => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("DISPATCH_SECRET")}`) return json({ error: "unauthorized" }, 401);
  const db = admin();
  const { data: due, error } = await db.from("outbox").select("*").in("status", ["pending", "failed"]).lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(50);
  if (error) return json({ error: error.message }, 500);
  const results: Record<string, string> = {};
  for (const row of due ?? []) {
    try {
      const { data: subs } = await db.from("subscriptions").select("*").eq("business_id", row.business_id).eq("event_type", row.type).eq("enabled", true);
      for (const s of subs ?? []) {
        if (!matchesFilter(s.filter, row.payload)) continue;
        await runAction(db, row, s);
      }
      await db.from("outbox").update({ status: "delivered", attempts: row.attempts + 1, last_error: null }).eq("id", row.id);
      results[row.id] = "delivered";
    } catch (e) {
      const attempts = row.attempts + 1, dead = attempts >= MAX_ATTEMPTS;
      await db.from("outbox").update({ status: dead ? "dead" : "failed", attempts, last_error: String(e).slice(0, 500),
        next_attempt_at: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString() }).eq("id", row.id);
      results[row.id] = dead ? "dead" : "retry";
    }
  }
  return json({ processed: Object.keys(results).length, results });
});

function matchesFilter(filter: Record<string, unknown>, payload: Record<string, unknown>) {
  return Object.entries(filter ?? {}).every(([k, v]) => payload[k] === v);
}

// deno-lint-ignore no-explicit-any
async function integration(db: any, businessId: string, kind: string): Promise<IntegrationRow | null> {
  const { data } = await db.from("integrations").select("*").eq("business_id", businessId).eq("kind", kind).eq("status", "active").eq("is_default", true).maybeSingle();
  if (!data) return null;
  const secrets: Record<string, string> = {};
  for (const id of data.vault_secret_ids ?? []) {
    const { data: s } = await db.rpc("read_integration_secret", { p_id: id });
    if (s) secrets[s.name] = s.secret;
  }
  return { id: data.id, kind: data.kind, provider: data.provider, config: data.config ?? {}, secrets };
}

// deno-lint-ignore no-explicit-any
async function runAction(db: any, row: any, sub: any) {
  const p = row.payload;
  if (sub.action === "whatsapp_template" || sub.action === "sms") {
    const integ = await integration(db, row.business_id, "message");
    if (!integ) throw new Error("Mesaj sağlayıcısı bağlı değil");
    const to = await recipientPhone(db, row.business_id, p.jobId, sub.params?.to ?? "customer");
    if (!to) return; // müşterinin telefonu ya da rızası yoksa sessizce atlanır, olay kaydında görünür
    const r = await messageAdapter(integ).send({ businessId: row.business_id, channel: sub.action === "sms" ? "sms" : "whatsapp", to,
      template: sub.params?.template ?? p.template, params: sub.params?.params ?? [], idempotencyKey: row.idempotency_key, jobId: p.jobId });
    await db.from("integration_logs").insert({ business_id: row.business_id, integration_id: integ.id, outbox_id: row.id, direction: "out", ok: r.ok, summary: r.ok ? r.value.providerRef : r.error.message });
    if (!r.ok && r.error.retryable) throw new Error(r.error.message);
    return;
  }
  if (sub.action === "issue_invoice") {
    const integ = await integration(db, row.business_id, "invoice");
    const { data: inv } = await db.from("invoices").select("*").eq("job_id", p.jobId).eq("status", "draft").maybeSingle();
    if (!integ || !inv) throw new Error("Fatura sağlayıcısı ya da taslak fatura yok");
    const { data: cust } = await db.from("customers").select("*").eq("id", inv.customer_id).maybeSingle();
    const r = await invoiceAdapter(integ).issue({ businessId: row.business_id, jobId: p.jobId, scenario: inv.scenario, type: inv.type, issueDate: inv.issue_date,
      currency: inv.currency, buyer: { name: cust?.name ?? "", taxNumber: cust?.tax_number, taxOffice: cust?.tax_office, address: cust?.address, email: cust?.email },
      lines: inv.lines, idempotencyKey: `${row.idempotency_key}:inv` });
    if (!r.ok) { if (r.error.retryable) throw new Error(r.error.message); await db.from("invoices").update({ status: "rejected" }).eq("id", inv.id); return; }
    await db.from("invoices").update({ status: r.value.status, provider: r.value.providerId, provider_ref: r.value.providerRef, number: r.value.number, uuid: r.value.uuid }).eq("id", inv.id);
    return;
  }
  if (sub.action === "payment_link") {
    const integ = await integration(db, row.business_id, "payment");
    if (!integ) throw new Error("Ödeme sağlayıcısı bağlı değil");
    const { data: job } = await db.from("jobs").select("id, title, amount, customer_id").eq("id", p.jobId).single();
    const r = await paymentAdapter(integ).createLink({ businessId: row.business_id, jobId: job.id, amount: job.amount, currency: "TRY", description: job.title, buyer: { name: "" }, idempotencyKey: `${row.idempotency_key}:pay` });
    if (!r.ok) { if (r.error.retryable) throw new Error(r.error.message); return; }
    await db.from("payments").insert({ business_id: row.business_id, job_id: job.id, amount: job.amount, method: "link", provider: r.value.providerId, provider_ref: r.value.providerRef, link_url: r.value.url, status: "pending" });
    return;
  }
  if (sub.action === "webhook") {
    const res = await fetch(sub.params.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Workflow-Event": row.type }, body: JSON.stringify(p) });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
    return;
  }
  // "push": Expo push bildirimi — cihaz jetonları tablosu Faz 1'de eklenecek.
}

// deno-lint-ignore no-explicit-any
async function recipientPhone(db: any, businessId: string, jobId: string, to: string): Promise<string | null> {
  if (to !== "customer") return to;
  const { data: job } = await db.from("jobs").select("customer_id").eq("id", jobId).eq("business_id", businessId).single();
  if (!job?.customer_id) return null;
  const { data: c } = await db.from("customers").select("phone, whatsapp_opt_in").eq("id", job.customer_id).single();
  return c?.whatsapp_opt_in && c.phone ? c.phone : null;
}
