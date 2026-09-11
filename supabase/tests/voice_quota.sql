begin;
do $$
declare actor text := repeat('f',64); quota_day date; i integer; original_day date;
begin
  -- Fixtures are isolated and always rolled back.
  delete from public.creation_usage where actor_hash=actor;
  if has_function_privilege('anon','public.reserve_voice_quota(text,text)','execute')
    or has_function_privilege('authenticated','public.refund_creation_quota(text,text,date)','execute') then raise exception 'Quota functions must be service-only'; end if;
  quota_day := public.reserve_voice_quota(actor,'voice');
  if quota_day is null then raise exception 'First request rejected'; end if;
  perform public.refund_creation_quota(actor,'voice',quota_day);
  if exists(select 1 from public.creation_usage where actor_hash=actor) then raise exception 'Failed request was charged'; end if;
  -- Duplicate refund is a safe no-op once no reservation remains.
  perform public.refund_creation_quota(actor,'voice',quota_day);
  for i in 1..10 loop
    if public.reserve_voice_quota(actor,'voice') is null then raise exception 'Premature limit'; end if;
  end loop;
  if public.reserve_voice_quota(actor,'voice') is not null then raise exception 'Exceeded daily limit'; end if;
  if public.reserve_voice_quota(actor,'voice_live') is null then raise exception 'Live and draft limits must be separate'; end if;
  original_day := quota_day - 1;
  insert into public.creation_usage values(actor,'voice',original_day,1);
  perform public.refund_creation_quota(actor,'voice',original_day);
  if (select requests from public.creation_usage where actor_hash=actor and kind='voice' and day=quota_day) <> 10 then raise exception 'Midnight refund touched wrong day'; end if;
end $$;
rollback;
