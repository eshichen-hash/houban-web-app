-- Applied to production as 20260911111605; preserve legacy paid events without an amount.
alter table public.events add column cost_amount integer;
alter table public.events add constraint events_cost_amount_bounds
  check (cost_amount is null or (cost = '免費' and cost_amount = 0) or (cost = '付費' and cost_amount between 1 and 9999));
grant select (cost_amount) on public.events to anon, authenticated;
create or replace view public.discoverable_events with (security_invoker = true) as
select id, title, type, difficulty, date_key, iso_date, date_label, time,
  park_id, park_name, park_district, park_address, park_meeting, park_lat, park_lng,
  spots, max_spots, cost, audience, description, items, image, image_alt,
  organizer_name, organizer_role, organizer_rating, organizer_verified, status, created_at, cost_amount
from public.events where status in ('active', 'full');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/webp']);
-- No INSERT/UPDATE/DELETE policy for anon or authenticated. The LINE-verified endpoint
-- issues a one-path signed upload token in a server-chosen, hashed owner folder.
create policy event_images_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'event-images');

create table public.creation_usage (
  actor_hash text not null check (actor_hash ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind in ('voice', 'image')),
  day date not null,
  requests integer not null check (requests > 0),
  primary key (actor_hash, kind, day)
);
alter table public.creation_usage enable row level security;
revoke all on public.creation_usage from public, anon, authenticated;
comment on table public.creation_usage is 'Service-only daily quota counters; no audio, transcript, draft, or raw LINE user ID.';
create function public.consume_creation_quota(p_actor_hash text, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare accepted integer; daily_limit integer; today date := (now() at time zone 'Asia/Taipei')::date;
begin
  if p_actor_hash !~ '^[a-f0-9]{64}$' or p_kind not in ('voice', 'image') then raise exception 'Invalid quota input'; end if;
  daily_limit := case when p_kind = 'voice' then 10 else 20 end;
  delete from public.creation_usage where day < today - 1;
  insert into public.creation_usage as usage (actor_hash, kind, day, requests)
  values (p_actor_hash, p_kind, today, 1)
  on conflict (actor_hash, kind, day) do update set requests = usage.requests + 1
  where usage.requests < daily_limit returning requests into accepted;
  return accepted is not null;
end $$;
revoke all on function public.consume_creation_quota(text, text) from public, anon, authenticated;
grant execute on function public.consume_creation_quota(text, text) to service_role;
notify pgrst, 'reload schema';
