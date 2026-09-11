-- Separate bounded live sessions from draft extraction; image quota is unchanged.
alter table public.creation_usage drop constraint creation_usage_kind_check;
alter table public.creation_usage add constraint creation_usage_kind_check check (kind in ('voice', 'voice_live', 'image'));
create or replace function public.consume_creation_quota(p_actor_hash text, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare accepted integer; daily_limit integer; today date := (now() at time zone 'Asia/Taipei')::date;
begin
  if p_actor_hash !~ '^[a-f0-9]{64}$' or p_kind not in ('voice', 'voice_live', 'image') then raise exception 'Invalid quota input'; end if;
  daily_limit := case when p_kind = 'image' then 20 else 10 end;
  delete from public.creation_usage where day < today - 1;
  insert into public.creation_usage as usage (actor_hash, kind, day, requests)
  values (p_actor_hash, p_kind, today, 1)
  on conflict (actor_hash, kind, day) do update set requests = usage.requests + 1
  where usage.requests < daily_limit returning requests into accepted;
  return accepted is not null;
end $$;

-- Return the database quota day so a failed request crossing midnight refunds the correct day.
create function public.reserve_voice_quota(p_actor_hash text, p_kind text)
returns date language plpgsql security invoker set search_path = '' as $$
begin
  if p_kind not in ('voice','voice_live') then raise exception 'Invalid voice quota'; end if;
  if public.consume_creation_quota(p_actor_hash, p_kind) then return (now() at time zone 'Asia/Taipei')::date; end if;
  return null;
end $$;

create function public.refund_creation_quota(p_actor_hash text, p_kind text, p_day date)
returns void language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
  if p_actor_hash !~ '^[a-f0-9]{64}$' or p_kind not in ('voice','voice_live') then raise exception 'Invalid quota refund'; end if;
  select requests into used from public.creation_usage where actor_hash=p_actor_hash and kind=p_kind and day=p_day for update;
  if used = 1 then delete from public.creation_usage where actor_hash=p_actor_hash and kind=p_kind and day=p_day;
  elsif used > 1 then update public.creation_usage set requests=requests-1 where actor_hash=p_actor_hash and kind=p_kind and day=p_day;
  end if;
end $$;
revoke all on function public.reserve_voice_quota(text,text) from public,anon,authenticated;
revoke all on function public.refund_creation_quota(text,text,date) from public,anon,authenticated;
grant execute on function public.reserve_voice_quota(text,text) to service_role;
grant execute on function public.refund_creation_quota(text,text,date) to service_role;
-- Explicit grants ensure the invoker functions work on projects with restrictive defaults.
grant select,insert,update,delete on public.creation_usage to service_role;
notify pgrst, 'reload schema';
