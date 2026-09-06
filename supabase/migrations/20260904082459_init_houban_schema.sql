-- Reconstructed baseline for the original remote migration. The final four
-- statements also capture columns and unique constraints that existed remotely
-- before the security migrations but were originally added outside migration
-- history. Keeping them here makes `supabase db reset` reproducible.

create table if not exists public.parks (
  id text primary key,
  name text not null,
  district text,
  address text,
  meeting text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

alter table public.parks enable row level security;
create policy "Public read parks" on public.parks for select using (true);
create policy "Public write parks" on public.parks for all using (true) with check (true);

create table if not exists public.events (
  id text primary key,
  title text not null,
  type text not null,
  difficulty text default '輕鬆',
  date_key text default 'today',
  iso_date date not null,
  date_label text not null,
  time text not null,
  park_id text,
  park_name text,
  park_district text,
  park_address text,
  park_meeting text,
  park_lat double precision,
  park_lng double precision,
  spots integer default 6,
  max_spots integer default 12,
  cost text default '免費',
  audience text,
  description text,
  items text,
  image text,
  image_alt text,
  organizer_id text,
  organizer_name text,
  organizer_role text,
  organizer_rating text,
  organizer_verified boolean default true,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.events enable row level security;
create policy "Public read events" on public.events for select using (true);
create policy "Public insert events" on public.events for insert with check (true);
create policy "Public update events" on public.events for update using (true);
create policy "Public delete events" on public.events for delete using (true);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  user_id text not null,
  user_name text,
  status text default 'confirmed',
  created_at timestamptz default now()
);

alter table public.registrations enable row level security;
create policy "Public read registrations" on public.registrations for select using (true);
create policy "Public insert registrations" on public.registrations for insert with check (true);
create policy "Public delete registrations" on public.registrations for delete using (true);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id text not null references public.events(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.favorites enable row level security;
create policy "Public read favorites" on public.favorites for select using (true);
create policy "Public insert favorites" on public.favorites for insert with check (true);
create policy "Public delete favorites" on public.favorites for delete using (true);

alter table public.registrations add column if not exists check_in_status text default 'pending';
alter table public.registrations add column if not exists user_avatar text;
alter table public.registrations add constraint unique_user_event_registration unique (event_id, user_id);
alter table public.favorites add constraint unique_user_favorite unique (user_id, event_id);
