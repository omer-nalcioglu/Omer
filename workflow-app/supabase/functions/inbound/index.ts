// Dışarıdan gelen webhook'lar: /inbound/whatsapp (gelen müşteri mesajı), /inbound/payment/<sağlayıcı>,
// /inbound/invoice/<sağlayıcı> (e-Fatura durum değişimi). İmza doğrulanmadan hiçbir şey yazılmaz.
import { admin, json } from "../_shared/db.ts";
import { messageAdapter } from "../_shared/registry.ts";

Deno.serve(async req => {
  const url = new URL(req.url), parts = url.pathname.split("/").filter(Boolean), route = parts.slice(parts.indexOf("inbound") + 1);
  const db = admin();
  if (route[0] === "whatsapp") {
    const businessId = url.searchParams.get("b");
    if (req.method === "GET") {
      // Meta abonelik doğrulaması
      const { data } = await db.from("integrations").select("config").eq("business_id", businessId).eq("provider", "whatsapp_cloud").single();
      return url.searchParams.get("hub.verify_token") === data?.config?.verifyToken ? new Response(url.searchParams.get("hub.challenge") ?? "") : json({ error: "forbidden" }, 403);
    }
    const raw = await req.text();
    const { data: integ } = await db.from("integrations").select("*").eq("business_id", businessId).eq("provider", "whatsapp_cloud").single();
    if (!integ) return json({ ok: true });
    const secrets: Record<string, string> = {};
    for (const id of integ.vault_secret_ids ?? []) { const { data: s } = await db.rpc("read_integration_secret", { p_id: id }); if (s) secrets[s.name] = s.secret; }
    const msgs = await messageAdapter({ id: integ.id, kind: "message", provider: "whatsapp_cloud", config: integ.config, secrets }).parseInbound?.(Object.fromEntries(req.headers), raw);
    if (!msgs) return json({ error: "bad_signature" }, 401);
    for (const m of msgs) {
      const { data: cust } = await db.from("customers").select("id").eq("business_id", businessId).eq("phone", m.from).maybeSingle();
      let thread = cust ? (await db.from("threads").select("id").eq("business_id", businessId).eq("kind", "customer").contains("members", [cust.id]).maybeSingle()).data : null;
      if (!thread) thread = (await db.from("threads").insert({ business_id: businessId, kind: "customer", members: cust ? [cust.id] : [], title: cust ? null : m.from }).select("id").single()).data;
      await db.from("messages").insert({ business_id: businessId, thread_id: thread!.id, customer_id: cust?.id ?? null, channel: "whatsapp", body: m.text ?? "", provider_ref: m.providerRef });
    }
    return json({ ok: true, received: msgs.length });
  }
  return json({ error: "unknown_route" }, 404);
});
