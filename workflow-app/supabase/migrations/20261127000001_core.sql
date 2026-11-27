-- Workflow çekirdek şeması
-- İlke: her satır bir işletmeye (business_id) aittir; erişim satır bazlı güvenlikle (RLS) üyeliğe bağlanır.
-- Para kuruş cinsinden bigint. Zamanlar timestamptz. Esnek veri jsonb, ama sorgulanan her şey kolon.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ işletme ve üyelik
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  tax_number text,               -- VKN/TCKN (fatura keserken)
  tax_office text,
  address text,
  phone text,
  settings jsonb not null default '{}'::jsonb,   -- mesai saatleri, KDV, modüller
  created_at timestamptz not null default now()
);

create table permission_groups (
  business_id uuid not null references businesses on delete cascade,
  key text not null,
  name text not null,
  home text not null check (home in ('boss','foreman','worker','driver')),
  perms text[] not null default '{}',
  locked boolean not null default false,
  primary key (business_id, key)
);

create table members (
  business_id uuid not null references businesses on delete cascade,
  user_id uuid references auth.users on delete set null,   -- davet kabul edilene kadar boş
  id uuid not null default gen_random_uuid(),
  name text not null,
  title text,
  phone text,
  group_key text not null,
  depts text[] not null default '{}',
  status text not null default 'invited' check (status in ('invited','active','disabled')),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (business_id, user_id),
  foreign key (business_id, group_key) references permission_groups (business_id, key)
);
create index on members (user_id);

create or replace function is_member(b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.business_id = b and m.user_id = auth.uid() and m.status = 'active')
$$;

create or replace function has_perm(b uuid, p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m join permission_groups g on g.business_id = m.business_id and g.key = m.group_key
    where m.business_id = b and m.user_id = auth.uid() and m.status = 'active' and p = any (g.perms))
$$;

create or replace function my_member_id(b uuid) returns uuid language sql stable security definer set search_path = public as $$
  select m.id from members m where m.business_id = b and m.user_id = auth.uid() and m.status = 'active' limit 1
$$;

-- ------------------------------------------------------------------ müşteri ve ürün
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null,
  contact text, phone text, email text, address text, city text, district text,
  tax_number text, tax_office text,
  e_invoice_user boolean,          -- sağlayıcı sorgusu sonucu önbellek
  whatsapp_opt_in boolean not null default false,  -- KVKK / WhatsApp politikası: açık rıza
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on customers (business_id, name);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  code text, name text not null, unit text not null default 'C62',
  price bigint not null default 0, vat_rate int not null default 20,
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true
);
create index on products (business_id, code);

-- ------------------------------------------------------------------ akışlar (sürümlü)
create table flows (
  id text not null,
  business_id uuid not null references businesses on delete cascade,
  name text not null,
  icon text,
  current_version int not null default 1,
  hidden boolean not null default false,
  archived boolean not null default false,
  primary key (business_id, id)
);

-- Her kayıt yeni bir sürümdür; işler açıldıkları sürüme bağlı kalır (değişiklik süren işleri bozmaz).
create table flow_versions (
  business_id uuid not null,
  flow_id text not null,
  version int not null,
  definition jsonb not null,        -- @workflow/core FlowDef
  created_by uuid,
  created_at timestamptz not null default now(),
  note text,
  primary key (business_id, flow_id, version),
  foreign key (business_id, flow_id) references flows (business_id, id) on delete cascade
);

-- ------------------------------------------------------------------ işler
create sequence job_numbers;
create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  number bigint not null default nextval('job_numbers'),
  flow_id text not null,
  flow_version int not null,
  parent_job_id uuid references jobs on delete set null,
  title text not null,
  customer_id uuid references customers on delete set null,
  qty numeric not null default 1, unit text not null default 'adet',
  due timestamptz not null,
  urgent boolean not null default false,
  status text not null default 'open' check (status in ('open','on_hold','done','cancelled')),
  amount bigint not null default 0,
  data jsonb not null default '{}'::jsonb,       -- akışa özel alanlar
  stages jsonb not null,                          -- @workflow/core StageRun haritası
  created_by uuid not null references members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,                 -- iyimser kilit: çevrimdışı eşitlemede çakışma tespiti
  foreign key (business_id, flow_id, flow_version) references flow_versions (business_id, flow_id, version)
);
create index on jobs (business_id, status, due);
create index jobs_stage_owner on jobs using gin (stages jsonb_path_ops);

create table job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs on delete cascade,
  business_id uuid not null,
  product_id uuid references products,
  code text, name text not null, variant text,
  qty numeric not null, unit text not null default 'C62',
  unit_price bigint not null default 0, vat_rate int not null default 20,
  done_qty numeric not null default 0
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  job_id uuid references jobs on delete cascade,
  stage_key text,
  kind text not null check (kind in ('photo','signature','voice','document','pdf')),
  storage_path text not null,       -- Supabase Storage: <business_id>/...
  created_by uuid references members (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ olaylar ve outbox
-- events: değişmez denetim kaydı. outbox: aynı işlemde yazılır, dağıtıcı tarafından teslim edilir.
create table events (
  id bigint generated always as identity primary key,
  business_id uuid not null references businesses on delete cascade,
  job_id uuid,
  type text not null,
  payload jsonb not null,
  actor uuid,
  created_at timestamptz not null default now()
);
create index on events (business_id, job_id, created_at);

create table outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  type text not null,
  payload jsonb not null,
  idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending','delivered','failed','dead')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);
create index outbox_due on outbox (next_attempt_at) where status in ('pending','failed');

-- ------------------------------------------------------------------ entegrasyonlar
-- Hangi işletme hangi sağlayıcıyı kullanıyor. Gizli anahtarlar burada DEĞİL, Supabase Vault'ta.
create table integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  kind text not null check (kind in ('invoice','message','payment','accounting')),
  provider text not null,            -- 'parasut', 'whatsapp_cloud', 'netgsm', 'iyzico', 'mock'
  status text not null default 'pending' check (status in ('pending','active','error','disabled')),
  config jsonb not null default '{}'::jsonb,   -- gizli olmayan ayarlar (ör. WhatsApp telefon no kimliği)
  vault_secret_ids uuid[] not null default '{}',
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, kind, provider)
);

-- Hangi olay hangi eyleme gider: yeni bir otomasyon = yeni satır, kod değişmez.
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  event_type text not null,          -- 'stage.ready', 'invoice.requested', ...
  filter jsonb not null default '{}'::jsonb,   -- {"flowId":"metal","stageKey":"teslim"}
  action text not null,              -- 'push', 'whatsapp_template', 'sms', 'issue_invoice', 'payment_link', 'webhook'
  params jsonb not null default '{}'::jsonb,
  enabled boolean not null default true
);

create table integration_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  integration_id uuid references integrations on delete set null,
  outbox_id uuid references outbox on delete set null,
  direction text not null check (direction in ('out','in')),
  ok boolean not null,
  summary text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ fatura ve tahsilat
create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  job_id uuid references jobs on delete set null,
  customer_id uuid references customers on delete set null,
  scenario text not null default 'AUTO',
  type text not null default 'SATIS',
  issue_date date not null default current_date,
  currency text not null default 'TRY',
  net bigint not null, vat bigint not null, total bigint not null,
  status text not null default 'draft' check (status in ('draft','queued','sent','accepted','rejected','cancelled')),
  provider text, provider_ref text, number text, uuid text, pdf_path text,
  lines jsonb not null,              -- @workflow/core InvoiceLine[]
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  job_id uuid references jobs on delete set null,
  invoice_id uuid references invoices on delete set null,
  amount bigint not null,
  method text not null check (method in ('cash','transfer','card','link','check')),
  provider text, provider_ref text, link_url text,
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_by uuid references members (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ sohbet ve mesajlar
create table threads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  kind text not null check (kind in ('job','dept','announce','direct','customer')),
  job_id uuid references jobs on delete cascade,
  dept text,
  members uuid[] not null default '{}',
  title text,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  thread_id uuid not null references threads on delete cascade,
  author uuid references members (id),
  customer_id uuid references customers,
  channel text not null default 'app' check (channel in ('app','whatsapp','sms','email','system')),
  body text,
  attachment_id uuid references attachments,
  provider_ref text,                 -- WhatsApp mesaj kimliği (köprü)
  created_at timestamptz not null default now()
);
create index on messages (thread_id, created_at);

-- ------------------------------------------------------------------ RLS
do $$ declare t text; begin
  foreach t in array array['customers','products','flows','flow_versions','jobs','job_items','attachments','events','invoices','payments','threads','messages','permission_groups','members'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(business_id))', t || '_read', t);
  end loop;
end $$;
alter table businesses enable row level security;
create policy businesses_read on businesses for select using (is_member(id));
create policy businesses_update on businesses for update using (has_perm(id, 'flows'));

create policy customers_write on customers for all using (has_perm(business_id, 'create')) with check (has_perm(business_id, 'create'));
create policy products_write on products for all using (has_perm(business_id, 'money')) with check (has_perm(business_id, 'money'));
create policy flows_write on flows for all using (has_perm(business_id, 'flows')) with check (has_perm(business_id, 'flows'));
create policy flow_versions_write on flow_versions for insert with check (has_perm(business_id, 'flows'));
create policy members_write on members for all using (has_perm(business_id, 'team')) with check (has_perm(business_id, 'team'));
create policy messages_write on messages for insert with check (is_member(business_id) and author = my_member_id(business_id));
create policy payments_write on payments for insert with check (has_perm(business_id, 'money'));
-- İşlerin durumu yalnızca `apply_command` sunucu fonksiyonuyla değişir (motor sunucuda doğrular, olayları outbox'a yazar).
-- Fatura, tahsilat bağlantısı, entegrasyon ve outbox tabloları istemciye kapalıdır (yalnızca service role).
alter table outbox enable row level security;
alter table integrations enable row level security;
alter table subscriptions enable row level security;
alter table integration_logs enable row level security;
create policy integrations_read on integrations for select using (has_perm(business_id, 'flows'));
create policy subscriptions_rw on subscriptions for all using (has_perm(business_id, 'flows')) with check (has_perm(business_id, 'flows'));
