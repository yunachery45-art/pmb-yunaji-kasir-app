-- Require an active cashier operator (or admin) for daily cash open/close actions.
-- Keeps the daily single-session rule and prevents anonymous sessions from acting as cash owner without selecting an operator.

drop function if exists public.kasir_buka_kas_harian(numeric,text);
drop function if exists public.kasir_tutup_kas_harian(numeric,text);

create function public.kasir_buka_kas_harian(p_kas_awal numeric,p_catatan text default null)
returns table(session_id uuid,tanggal date,kas_awal numeric,status text)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_date date; v_id uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if not public.kasir_is_admin() and not exists (select 1 from public.kasir_operator_sessions os where os.user_id=auth.uid() and os.aktif=true) then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  if p_kas_awal is null or p_kas_awal < 0 then raise exception 'Kas awal tidak boleh negatif.'; end if;
  v_date := (now() at time zone 'Asia/Jakarta')::date;
  select ks.id,ks.status into v_id,v_status from public.kas_sesi ks where ks.tanggal=v_date limit 1 for update;
  if v_id is not null then raise exception 'Kas hari ini sudah pernah dibuka. Kas yang sudah ditutup tidak dapat dibuka kembali.'; end if;
  insert into public.kas_sesi(tanggal,kas_awal,kas_masuk,kas_keluar,kas_sistem,status,dibuka_pada,dibuka_oleh,catatan)
  values(v_date,round(p_kas_awal,2),0,0,round(p_kas_awal,2),'OPEN',now(),auth.uid(),nullif(trim(p_catatan),''))
  returning id into v_id;
  return query select v_id,v_date,round(p_kas_awal,2),'OPEN'::text;
end;
$function$;

grant execute on function public.kasir_buka_kas_harian(numeric,text) to authenticated;

create function public.kasir_tutup_kas_harian(p_kas_fisik numeric,p_catatan text default null)
returns table(session_id uuid,kas_sistem numeric,kas_fisik numeric,selisih numeric,status text)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_id uuid; v_expected numeric; v_status text; v_diff numeric; v_date date;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if not public.kasir_is_admin() and not exists (select 1 from public.kasir_operator_sessions os where os.user_id=auth.uid() and os.aktif=true) then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  if p_kas_fisik is null or p_kas_fisik < 0 then raise exception 'Kas fisik tidak boleh negatif.'; end if;
  v_date := (now() at time zone 'Asia/Jakarta')::date;
  select ks.id,ks.kas_sistem,ks.status into v_id,v_expected,v_status from public.kas_sesi ks where ks.tanggal=v_date limit 1 for update;
  if v_id is null then raise exception 'Kas hari ini belum dibuka.'; end if;
  if v_status <> 'OPEN' then raise exception 'Kas hari ini sudah ditutup.'; end if;
  v_diff := round(p_kas_fisik-v_expected,2);
  if v_diff <> 0 and nullif(trim(coalesce(p_catatan,'')),'') is null then raise exception 'Ada selisih kas. Catatan selisih wajib diisi.'; end if;
  update public.kas_sesi set kas_fisik=round(p_kas_fisik,2),selisih=v_diff,alasan_selisih=nullif(trim(p_catatan),''),status='CLOSED',ditutup_pada=now(),ditutup_oleh=auth.uid(),updated_at=now() where id=v_id;
  return query select v_id,v_expected,round(p_kas_fisik,2),v_diff,'CLOSED'::text;
end;
$function$;

grant execute on function public.kasir_tutup_kas_harian(numeric,text) to authenticated;
