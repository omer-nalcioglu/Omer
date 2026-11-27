-- İş değişikliklerini tek işlemde yazar: iş satırı (iyimser kilitle), olay kaydı ve outbox.
-- Yalnızca `apply-command` sunucu fonksiyonu (service role) çağırır; motor kararı orada verilir.
create or replace function commit_job(
  p_job jsonb, p_expected_version int, p_events jsonb, p_actor uuid, p_is_new boolean default false
) returns int language plpgsql security definer set search_path = public as $$
declare v_business uuid := (p_job->>'businessId')::uuid; v_id uuid := (p_job->>'id')::uuid; v_new int; e jsonb;
begin
  if p_is_new then
    insert into jobs (id, business_id, number, flow_id, flow_version, parent_job_id, title, customer_id, qty, unit, due, urgent, status, amount, data, stages, created_by)
    values (v_id, v_business, (p_job->>'number')::bigint, p_job->>'flowId', (p_job->>'flowVersion')::int, nullif(p_job->>'parentJobId','')::uuid,
            p_job->>'title', nullif(p_job->>'customerId','')::uuid, (p_job->>'qty')::numeric, p_job->>'unit', to_timestamp((p_job->>'due')::bigint / 1000.0),
            (p_job->>'urgent')::boolean, p_job->>'status', (p_job->>'amount')::bigint, p_job->'data', p_job->'stages', p_actor);
    v_new := 1;
  else
    update jobs set status = p_job->>'status', data = p_job->'data', stages = p_job->'stages', urgent = (p_job->>'urgent')::boolean,
                    due = to_timestamp((p_job->>'due')::bigint / 1000.0), updated_at = now(), version = version + 1
      where id = v_id and version = p_expected_version
      returning version into v_new;
    if v_new is null then raise exception 'version_conflict' using errcode = '40001'; end if;
  end if;
  for e in select * from jsonb_array_elements(p_events) loop
    insert into events (business_id, job_id, type, payload, actor) values (v_business, v_id, e->>'type', e, p_actor);
    insert into outbox (business_id, type, payload, idempotency_key)
      values (v_business, e->>'type', e, concat_ws(':', e->>'type', e->>'jobId', e->>'stageKey', e->>'at'))
      on conflict (business_id, idempotency_key) do nothing;
  end loop;
  return v_new;
end $$;
revoke all on function commit_job from public, anon, authenticated;

create or replace function next_job_number() returns bigint language sql as $$ select nextval('job_numbers') $$;
revoke all on function next_job_number from public, anon, authenticated;

create or replace function member_perms(p_member uuid) returns text[] language sql stable security definer set search_path = public as $$
  select g.perms from members m join permission_groups g on g.business_id = m.business_id and g.key = m.group_key where m.id = p_member
$$;
revoke all on function member_perms from public, anon, authenticated;
