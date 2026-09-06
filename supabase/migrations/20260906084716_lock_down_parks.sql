-- Park data is public reference data. Browsers may read it, but only the
-- trusted backend/database owner may create or change it.

drop policy if exists "Public write parks" on public.parks;
drop policy if exists "Public read parks" on public.parks;

revoke all privileges on table public.parks from anon, authenticated;
grant select on table public.parks to anon, authenticated;

create policy "Public read parks"
  on public.parks
  for select
  to anon, authenticated
  using (true);
