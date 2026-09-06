-- Security boundary: browsers may read discoverable events, but all personal
-- data and writes must pass through the LINE-verifying Edge Function.

update public.events set status = 'active' where status is null;
update public.events set max_spots = 12 where max_spots is null;
update public.events set spots = least(max_spots, greatest(0, coalesce(spots, max_spots)));

alter table public.events
  alter column status set not null,
  alter column spots set not null,
  alter column max_spots set not null,
  alter column organizer_id set not null;

alter table public.events
  add constraint events_capacity_bounds check (max_spots between 1 and 50 and spots between 0 and max_spots),
  add constraint events_status_allowed check (status in ('active', 'full', 'cancelled', 'ended')),
  add constraint events_organizer_id_present check (length(btrim(organizer_id)) > 0);

alter table public.registrations
  add constraint registrations_status_allowed check (status = 'confirmed'),
  add constraint registrations_check_in_status_allowed check (check_in_status in ('pending', 'checked_in', 'absent')),
  add constraint registrations_user_id_present check (length(btrim(user_id)) > 0);

alter table public.favorites
  add constraint favorites_user_id_present check (length(btrim(user_id)) > 0);

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('events', 'registrations', 'favorites')
  loop
    execute format('drop policy %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end
$$;

revoke all privileges on table public.events from anon, authenticated;
revoke all privileges on table public.registrations from anon, authenticated;
revoke all privileges on table public.favorites from anon, authenticated;

grant select on table public.events to anon, authenticated;

create policy "Public read discoverable events"
  on public.events
  for select
  to anon, authenticated
  using (status in ('active', 'full'));

create or replace function public.register_event_atomic(
  p_event_id text,
  p_user_id text,
  p_user_name text,
  p_user_avatar text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_spots integer;
  v_status text;
  v_exists boolean;
begin
  if p_event_id is null or length(btrim(p_event_id)) = 0
    or p_user_id is null or length(btrim(p_user_id)) = 0
    or p_user_name is null or length(btrim(p_user_name)) = 0 then
    return jsonb_build_object('success', false, 'message', '報名資料不完整');
  end if;

  select spots, status
    into v_spots, v_status
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', '活動不存在');
  end if;

  if v_status not in ('active', 'full') then
    return jsonb_build_object('success', false, 'message', '此活動已取消或結束，無法報名', 'status', v_status, 'spots', v_spots);
  end if;

  select exists(
    select 1
    from public.registrations
    where event_id = p_event_id and user_id = p_user_id and status = 'confirmed'
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('success', true, 'message', '你已完成報名', 'idempotent', true, 'status', v_status, 'spots', v_spots);
  end if;

  if v_spots <= 0 or v_status = 'full' then
    return jsonb_build_object('success', false, 'message', '很抱歉，此活動名額已額滿', 'status', 'full', 'spots', 0);
  end if;

  insert into public.registrations (
    event_id, user_id, user_name, user_avatar, status, check_in_status
  ) values (
    p_event_id, p_user_id, p_user_name, p_user_avatar, 'confirmed', 'pending'
  );

  update public.events
  set
    spots = spots - 1,
    status = case when spots - 1 = 0 then 'full' else 'active' end
  where id = p_event_id
  returning spots, status into v_spots, v_status;

  return jsonb_build_object('success', true, 'message', '報名成功', 'idempotent', false, 'status', v_status, 'spots', v_spots);
end;
$$;

create or replace function public.cancel_event_atomic(
  p_event_id text,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count integer;
  v_spots integer;
  v_max_spots integer;
  v_status text;
begin
  if p_event_id is null or length(btrim(p_event_id)) = 0
    or p_user_id is null or length(btrim(p_user_id)) = 0 then
    return jsonb_build_object('success', false, 'message', '取消報名資料不完整');
  end if;

  select spots, max_spots, status
    into v_spots, v_max_spots, v_status
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', '活動不存在');
  end if;

  delete from public.registrations
  where event_id = p_event_id and user_id = p_user_id;
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    return jsonb_build_object('success', true, 'message', '報名已取消', 'idempotent', true, 'status', v_status, 'spots', v_spots);
  end if;

  update public.events
  set
    spots = least(max_spots, spots + 1),
    status = case when status = 'full' then 'active' else status end
  where id = p_event_id
  returning spots, status into v_spots, v_status;

  return jsonb_build_object('success', true, 'message', '已取消報名，名額已釋出', 'idempotent', false, 'status', v_status, 'spots', v_spots);
end;
$$;

drop function if exists public.check_in_participant(text, text, text);

create function public.check_in_participant(
  p_event_id text,
  p_participant_user_id text,
  p_status text,
  p_actor_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organizer_id text;
  v_updated_count integer;
begin
  if p_status not in ('pending', 'checked_in', 'absent') then
    return jsonb_build_object('success', false, 'message', '簽到狀態不正確');
  end if;

  select organizer_id into v_organizer_id
  from public.events
  where id = p_event_id;

  if not found or v_organizer_id <> p_actor_user_id then
    return jsonb_build_object('success', false, 'message', '你沒有管理這場活動的權限');
  end if;

  update public.registrations
  set check_in_status = p_status
  where event_id = p_event_id
    and user_id = p_participant_user_id
    and status = 'confirmed';
  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    return jsonb_build_object('success', false, 'message', '找不到這位參加者的報名紀錄');
  end if;

  return jsonb_build_object('success', true, 'message', '簽到狀態已更新');
end;
$$;

revoke execute on function public.register_event_atomic(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_event_atomic(text, text) from public, anon, authenticated;
revoke execute on function public.check_in_participant(text, text, text, text) from public, anon, authenticated;

grant execute on function public.register_event_atomic(text, text, text, text) to service_role;
grant execute on function public.cancel_event_atomic(text, text) to service_role;
grant execute on function public.check_in_participant(text, text, text, text) to service_role;

comment on function public.register_event_atomic(text, text, text, text)
  is 'Service-role-only idempotent registration transaction. Caller identity must be verified by line-api.';
comment on function public.cancel_event_atomic(text, text)
  is 'Service-role-only idempotent cancellation transaction. Caller identity must be verified by line-api.';
comment on function public.check_in_participant(text, text, text, text)
  is 'Service-role-only organizer-authorized participant check-in transaction.';
