-- Applied remotely: admin_delete_series
-- Deletes a series (CASCADE removes roster, workshops, RSVPs).

CREATE OR REPLACE FUNCTION public.admin_delete_series(p_admin_token text, p_series_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  deleted_id uuid;
begin
  perform public._book_assert_admin(p_admin_token);

  if p_series_id is null then
    raise exception 'series id required';
  end if;

  delete from public.series
  where id = p_series_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'series not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', deleted_id);
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_series(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_series(text, uuid) TO anon, authenticated;
