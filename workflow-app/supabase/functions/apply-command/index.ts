// İşi değiştiren her komut buradan geçer: kullanıcı doğrulanır, yetkisi kontrol edilir, motor sunucuda
// çalışır ve sonuç tek işlemde (iş + olaylar + outbox) yazılır. Telefon aynı motoru çevrimdışı da
// çalıştırır; bağlantı gelince komutları buraya sırayla yollar, sürüm çakışırsa yeniden dener.
import { admin, asUser, json } from "../_shared/db.ts";
import {
  completeStage, createJob, reportIssue, resolveIssue, sendBack, startStage, holdJob, resumeJob, cancelJob, FlowError,
  type FlowDef, type Job, type Result,
} from "../_shared/core.ts";

type Command =
  | { type: "create"; businessId: string; flowId: string; input: Record<string, unknown> }
  | { type: "start" | "complete" | "issue" | "resolve" | "send_back" | "hold" | "resume" | "cancel"; jobId: string; expectedVersion: number;
      stageKey?: string; choice?: string; data?: Record<string, string | number | boolean | null>; to?: string; note?: string; issueType?: string };

Deno.serve(async req => {
  const user = asUser(req), db = admin();
  const { data: auth } = await user.auth.getUser();
  if (!auth?.user) return json({ error: "unauthorized" }, 401);
  const cmd = (await req.json()) as Command;
  try {
    const businessId = cmd.type === "create" ? cmd.businessId : (await db.from("jobs").select("business_id").eq("id", cmd.jobId).single()).data?.business_id;
    const { data: me } = await db.from("members").select("id, group_key").eq("business_id", businessId).eq("user_id", auth.user.id).eq("status", "active").single();
    if (!me) return json({ error: "not_member" }, 403);
    const { data: perms } = await db.rpc("member_perms", { p_member: me.id });
    const can = (p: string) => (perms ?? []).includes(p);
    const ctx = { now: Date.now(), by: me.id };

    if (cmd.type === "create") {
      if (!can("create")) return json({ error: "forbidden" }, 403);
      const flow = await loadFlow(db, businessId, cmd.flowId);
      const r = createJob(flow, { ...(cmd.input as never), id: crypto.randomUUID(), businessId, number: 0 }, ctx);
      const { data: num } = await db.rpc("next_job_number");
      r.job.number = num;
      await db.rpc("commit_job", { p_job: r.job, p_expected_version: 0, p_events: r.events, p_actor: me.id, p_is_new: true });
      return json({ job: r.job, version: 1 });
    }

    const { data: row } = await db.from("jobs").select("*").eq("id", cmd.jobId).single();
    const flow = await loadFlow(db, row.business_id, row.flow_id, row.flow_version);
    const job = rowToJob(row);
    const run = cmd.stageKey ? job.stages[cmd.stageKey] : undefined;
    const onIt = run ? run.crew.includes(me.id) || run.owner === me.id : false;
    let r: Result;
    switch (cmd.type) {
      case "start": if (!onIt && run?.owner != null && !can("assign")) return json({ error: "forbidden" }, 403); r = startStage(job, flow, cmd.stageKey!, ctx); break;
      case "complete": if (!onIt && !can("approve")) return json({ error: "forbidden" }, 403); r = completeStage(job, flow, cmd.stageKey!, ctx, { choice: cmd.choice, data: cmd.data }); break;
      case "issue": r = reportIssue(job, flow, cmd.stageKey!, cmd.issueType ?? "Diğer", cmd.note ?? "", ctx); break;
      case "resolve": if (!can("assign")) return json({ error: "forbidden" }, 403); r = resolveIssue(job, cmd.stageKey!, ctx); break;
      case "send_back": if (!onIt && !can("approve")) return json({ error: "forbidden" }, 403); r = sendBack(job, flow, cmd.stageKey!, cmd.to!, cmd.note ?? "", ctx); break;
      case "hold": if (!can("assign")) return json({ error: "forbidden" }, 403); r = holdJob(job, cmd.note ?? "", ctx); break;
      case "resume": if (!can("assign")) return json({ error: "forbidden" }, 403); r = resumeJob(job, ctx); break;
      case "cancel": if (!can("create")) return json({ error: "forbidden" }, 403); r = cancelJob(job, cmd.note ?? "", ctx); break;
    }
    const { data: version, error } = await db.rpc("commit_job", { p_job: r.job, p_expected_version: cmd.expectedVersion, p_events: r.events, p_actor: me.id });
    if (error?.message?.includes("version_conflict")) return json({ error: "version_conflict", current: rowToJob((await db.from("jobs").select("*").eq("id", cmd.jobId).single()).data) }, 409);
    if (error) throw error;
    return json({ job: r.job, version });
  } catch (e) {
    if (e instanceof FlowError) return json({ error: e.code, message: e.message }, 422);
    return json({ error: "internal", message: String(e) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function loadFlow(db: any, businessId: string, flowId: string, version?: number): Promise<FlowDef> {
  let v = version;
  if (!v) v = (await db.from("flows").select("current_version").eq("business_id", businessId).eq("id", flowId).single()).data.current_version;
  const { data } = await db.from("flow_versions").select("definition").eq("business_id", businessId).eq("flow_id", flowId).eq("version", v).single();
  return data.definition as FlowDef;
}

// deno-lint-ignore no-explicit-any
function rowToJob(r: any): Job {
  return { id: r.id, businessId: r.business_id, flowId: r.flow_id, flowVersion: r.flow_version, number: r.number, title: r.title, customerId: r.customer_id,
    customerName: "", qty: Number(r.qty), unit: r.unit, due: Date.parse(r.due), createdAt: Date.parse(r.created_at), createdBy: r.created_by, urgent: r.urgent,
    status: r.status, data: r.data, stages: r.stages, parentJobId: r.parent_job_id, amount: Number(r.amount), log: [] };
}
