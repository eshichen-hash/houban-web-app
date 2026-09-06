-- Public discovery must never expose a stable LINE user identifier.
revoke select on table public.events from anon, authenticated;

grant select (
  id, title, type, difficulty, date_key, iso_date, date_label, time,
  park_id, park_name, park_district, park_address, park_meeting, park_lat, park_lng,
  spots, max_spots, cost, audience, description, items, image, image_alt,
  organizer_name, organizer_role, organizer_rating, organizer_verified,
  status, created_at
) on table public.events to anon, authenticated;

create or replace view public.discoverable_events
with (security_invoker = true)
as
select
  id, title, type, difficulty, date_key, iso_date, date_label, time,
  park_id, park_name, park_district, park_address, park_meeting, park_lat, park_lng,
  spots, max_spots, cost, audience, description, items, image, image_alt,
  organizer_name, organizer_role, organizer_rating, organizer_verified,
  status, created_at
from public.events
where status in ('active', 'full');

revoke all privileges on table public.discoverable_events from public, anon, authenticated;
grant select on table public.discoverable_events to anon, authenticated;

comment on view public.discoverable_events
  is 'Public active/full event projection that intentionally excludes organizer_id (LINE sub).';

notify pgrst, 'reload schema';
