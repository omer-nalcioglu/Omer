-- Entegrasyon anahtarları Supabase Vault'ta şifreli durur; yalnızca sunucu fonksiyonları okuyabilir.
create or replace function read_integration_secret(p_id uuid) returns table (name text, secret text)
language sql security definer set search_path = public, vault as $$
  select s.name, s.decrypted_secret from vault.decrypted_secrets s where s.id = p_id
$$;
revoke all on function read_integration_secret from public, anon, authenticated;
