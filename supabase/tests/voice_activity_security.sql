-- Run after the voice_activity_drafts_and_images migration; leaves no changes.
begin;
do $$
declare allowed boolean; i integer;
begin
  assert exists (select from storage.buckets where id = 'event-images' and public and file_size_limit = 5242880 and allowed_mime_types = array['image/webp']);
  assert not has_function_privilege('anon', 'public.consume_creation_quota(text,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.consume_creation_quota(text,text)', 'execute');
  assert not has_table_privilege('anon', 'public.creation_usage', 'select');
  assert not has_table_privilege('authenticated', 'public.creation_usage', 'select');
  assert has_function_privilege('service_role', 'public.consume_creation_quota(text,text)', 'execute');
  assert not has_column_privilege('anon', 'public.events', 'organizer_id', 'select');
  assert has_column_privilege('anon', 'public.events', 'cost_amount', 'select');
  assert not exists (select from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT','UPDATE','DELETE','ALL') and (roles::text[] && array['anon','authenticated','public']) and coalesce(with_check, qual, '') like '%event-images%');
  for i in 1..10 loop
    allowed := public.consume_creation_quota(repeat('0', 64), 'voice'); assert allowed;
  end loop;
  allowed := public.consume_creation_quota(repeat('0', 64), 'voice'); assert not allowed;
  -- Image and voice budgets are independent.
  allowed := public.consume_creation_quota(repeat('0', 64), 'image'); assert allowed;
end $$;
rollback;
