-- Auto-numbered workshop titles: "{Series Title} - Workshop N"
-- Applied remotely via Supabase MCP as workshop_auto_titles
-- Project: delpach-book (dlbjuosvisjjowlwophz)

alter table public.workshops
  add column if not exists title text;

-- Backfill existing workshops (1-based by created_at within each series)
with numbered as (
  select
    w.id,
    s.title as series_title,
    row_number() over (partition by w.series_id order by w.created_at) as n
  from public.workshops w
  join public.series s on s.id = w.series_id
  where w.title is null or btrim(w.title) = ''
)
update public.workshops w
set title = numbered.series_title || ' - Workshop ' || numbered.n::text
from numbered
where w.id = numbered.id;

alter table public.workshops
  alter column title set not null;

create or replace function public.admin_create_workshop(
  p_admin_token text,
  p_series_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_capacity integer
)
returns workshops
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  row public.workshops;
  series_title text;
  next_n integer;
begin
  perform public._book_assert_admin(p_admin_token);
  select s.title into series_title from public.series s where s.id = p_series_id;
  if series_title is null then
    raise exception 'series not found';
  end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 then
    raise exception 'duration invalid';
  end if;
  if p_capacity is null or p_capacity <= 0 then
    raise exception 'capacity invalid';
  end if;

  select count(*)::int + 1
  into next_n
  from public.workshops
  where series_id = p_series_id;

  insert into public.workshops (series_id, starts_at, duration_minutes, capacity, title)
  values (
    p_series_id,
    p_starts_at,
    p_duration_minutes,
    p_capacity,
    series_title || ' - Workshop ' || next_n::text
  )
  returning * into row;
  return row;
end;
$function$;

create or replace function public.admin_series_detail(
  p_admin_token text,
  p_series_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.series;
  result jsonb;
begin
  perform public._book_assert_admin(p_admin_token);
  select * into s from public.series where id = p_series_id;
  if s.id is null then
    raise exception 'series not found';
  end if;

  result := jsonb_build_object(
    'series', to_jsonb(s),
    'roster_count', (select count(*) from public.roster_people where series_id = p_series_id),
    'yes_count', (select count(*) from public.roster_people rp where rp.series_id = p_series_id and public._book_person_has_series_yes(rp.id)),
    'remaining', coalesce((
      select jsonb_agg(jsonb_build_object('id', rp.id, 'name', rp.name, 'email', rp.email) order by rp.name)
      from public.roster_people rp
      where rp.series_id = p_series_id
        and not public._book_person_has_series_yes(rp.id)
    ), '[]'::jsonb),
    'yes_names', coalesce((
      select jsonb_agg(jsonb_build_object('id', rp.id, 'name', rp.name, 'email', rp.email) order by rp.name)
      from public.roster_people rp
      where rp.series_id = p_series_id
        and public._book_person_has_series_yes(rp.id)
    ), '[]'::jsonb),
    'workshops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id,
        'title', w.title,
        'public_token', w.public_token,
        'starts_at', w.starts_at,
        'duration_minutes', w.duration_minutes,
        'capacity', w.capacity,
        'yes_count', public._book_workshop_yes_count(w.id),
        'no_count', (select count(*) from public.rsvps r where r.workshop_id = w.id and r.attending = false),
        'created_at', w.created_at
      ) order by w.starts_at)
      from public.workshops w
      where w.series_id = p_series_id
    ), '[]'::jsonb)
  );
  return result;
end;
$function$;

create or replace function public.admin_list_invitees(
  p_admin_token text,
  p_workshop_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.workshops;
  s public.series;
  invitees jsonb;
  missing_email int;
begin
  perform public._book_assert_admin(p_admin_token);
  select * into w from public.workshops where id = p_workshop_id;
  if w.id is null then
    raise exception 'workshop not found';
  end if;
  select * into s from public.series where id = w.series_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', rp.id,
    'name', rp.name,
    'email', rp.email
  ) order by rp.name), '[]'::jsonb)
  into invitees
  from public.roster_people rp
  where rp.series_id = w.series_id
    and not public._book_person_has_series_yes(rp.id)
    and rp.email is not null
    and rp.email <> '';

  select count(*)::int into missing_email
  from public.roster_people rp
  where rp.series_id = w.series_id
    and not public._book_person_has_series_yes(rp.id)
    and (rp.email is null or rp.email = '');

  return jsonb_build_object(
    'series', jsonb_build_object('id', s.id, 'title', s.title),
    'workshop', jsonb_build_object(
      'id', w.id,
      'title', w.title,
      'public_token', w.public_token,
      'starts_at', w.starts_at,
      'duration_minutes', w.duration_minutes,
      'capacity', w.capacity
    ),
    'invitees', invitees,
    'missing_email_count', missing_email
  );
end;
$function$;

create or replace function public.guest_get_workshop(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.workshops;
  s public.series;
  yes_count integer;
  eligible jsonb;
begin
  select * into w from public.workshops where public_token = p_public_token;
  if w.id is null then
    raise exception 'workshop not found';
  end if;
  select * into s from public.series where id = w.series_id;
  yes_count := public._book_workshop_yes_count(w.id);

  select coalesce(jsonb_agg(jsonb_build_object('id', rp.id, 'name', rp.name) order by rp.name), '[]'::jsonb)
  into eligible
  from public.roster_people rp
  where rp.series_id = w.series_id
    and (
      not public._book_person_has_series_yes(rp.id)
      or exists (
        select 1 from public.rsvps r
        where r.workshop_id = w.id and r.person_id = rp.id and r.attending = true
      )
    );

  return jsonb_build_object(
    'workshop', jsonb_build_object(
      'id', w.id,
      'title', w.title,
      'public_token', w.public_token,
      'starts_at', w.starts_at,
      'duration_minutes', w.duration_minutes,
      'capacity', w.capacity,
      'yes_count', yes_count,
      'seats_remaining', greatest(w.capacity - yes_count, 0),
      'is_full', yes_count >= w.capacity
    ),
    'series', jsonb_build_object('id', s.id, 'title', s.title),
    'eligible_people', eligible
  );
end;
$function$;
