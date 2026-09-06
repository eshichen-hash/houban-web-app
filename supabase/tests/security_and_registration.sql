begin;

do $$
declare
  v_event_id constant text := 'security-test-event';
  v_user_id constant text := 'security-test-user';
  v_result jsonb;
  v_spots integer;
begin
  insert into public.events (
    id, title, type, iso_date, date_label, time, spots, max_spots,
    organizer_id, organizer_name, status
  ) values (
    v_event_id, '安全測試活動', '健走', current_date + 1, '明天', '09:00－10:00', 2, 2,
    'security-test-organizer', '安全測試主辦者', 'active'
  );

  v_result := public.register_event_atomic(v_event_id, v_user_id, '測試參加者', null);
  if not coalesce((v_result->>'success')::boolean, false) or coalesce((v_result->>'idempotent')::boolean, true) then
    raise exception 'first registration should succeed exactly once: %', v_result;
  end if;

  v_result := public.register_event_atomic(v_event_id, v_user_id, '測試參加者', null);
  if not coalesce((v_result->>'success')::boolean, false) or not coalesce((v_result->>'idempotent')::boolean, false) then
    raise exception 'repeat registration should be idempotent: %', v_result;
  end if;

  select spots into v_spots from public.events where id = v_event_id;
  if v_spots <> 1 then raise exception 'repeat registration changed capacity: %', v_spots; end if;

  v_result := public.register_event_atomic(v_event_id, 'second-user', '第二位測試者', null);
  if not coalesce((v_result->>'success')::boolean, false) or (v_result->>'spots')::integer <> 0 then
    raise exception 'last available spot should be accepted and reach zero: %', v_result;
  end if;

  v_result := public.register_event_atomic(v_event_id, 'over-capacity-user', '超額測試者', null);
  if coalesce((v_result->>'success')::boolean, false) or (v_result->>'spots')::integer <> 0 then
    raise exception 'full event exceeded its lower capacity bound: %', v_result;
  end if;

  update public.events set status = 'cancelled' where id = v_event_id;
  v_result := public.register_event_atomic(v_event_id, 'cancelled-event-user', '取消活動測試者', null);
  if coalesce((v_result->>'success')::boolean, false) then raise exception 'cancelled event accepted registration'; end if;

  update public.events set status = 'ended' where id = v_event_id;
  v_result := public.register_event_atomic(v_event_id, 'ended-event-user', '結束活動測試者', null);
  if coalesce((v_result->>'success')::boolean, false) then raise exception 'ended event accepted registration'; end if;

  v_result := public.cancel_event_atomic(v_event_id, v_user_id);
  if not coalesce((v_result->>'success')::boolean, false) or coalesce((v_result->>'idempotent')::boolean, true) then
    raise exception 'first cancellation should release exactly once: %', v_result;
  end if;

  v_result := public.cancel_event_atomic(v_event_id, v_user_id);
  if not coalesce((v_result->>'success')::boolean, false) or not coalesce((v_result->>'idempotent')::boolean, false) then
    raise exception 'repeat cancellation should be idempotent: %', v_result;
  end if;

  select spots into v_spots from public.events where id = v_event_id;
  if v_spots <> 1 then raise exception 'repeat cancellation changed capacity: %', v_spots; end if;
end;
$$;

do $$
begin
  if has_table_privilege('anon', 'public.registrations', 'SELECT')
    or has_table_privilege('anon', 'public.favorites', 'SELECT')
    or has_table_privilege('anon', 'public.events', 'INSERT')
    or has_table_privilege('anon', 'public.parks', 'INSERT')
    or not has_table_privilege('anon', 'public.parks', 'SELECT') then
    raise exception 'anonymous table privileges are broader than intended';
  end if;

  if has_function_privilege('anon', 'public.register_event_atomic(text,text,text,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.cancel_event_atomic(text,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.check_in_participant(text,text,text,text)', 'EXECUTE') then
    raise exception 'private RPC remains executable by a browser role';
  end if;
end;
$$;

rollback;
