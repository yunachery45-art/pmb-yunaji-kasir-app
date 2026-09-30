create or replace function public.kasir_buka_kas_staff()
returns table(session_id uuid, tanggal date, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id bigint;
  v_opening numeric := 0;
  v_result record;
begin
  if auth.uid() is null then
    raise exception 'Sesi belum login.';
  end if;

  select staff_id into v_staff_id
  from public.kasir_operator_sessions
  where user_id = auth.uid() and aktif = true
  order by created_at desc
  limit 1;

  if v_staff_id is null then
    raise exception 'Pilih nama PJ/Kasir terlebih dahulu.';
  end if;

  select nullif(trim(nilai),'')::numeric
    into v_opening
  from public.pengaturan
  where kode = 'KAS_AWAL_DEFAULT'
  limit 1;

  v_opening := coalesce(v_opening, 0);

  select * into v_result
  from public.kasir_buka_kas_harian(v_opening, 'Dibuka oleh PJ/Staff');

  return query
  select v_result.session_id, v_result.tanggal, v_result.status;
end;
$$;

revoke all on function public.kasir_buka_kas_staff() from public;
grant execute on function public.kasir_buka_kas_staff() to authenticated;
