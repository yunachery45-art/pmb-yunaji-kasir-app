-- Fix reopening a closed cash session on the same date.
-- The daily unique key remains intact: reopening reuses the existing row instead of inserting a duplicate.

create or replace function public.kasir_buka_kas_sesi(p_tanggal date,p_kas_awal numeric,p_catatan text default null)
returns table(session_id uuid,tanggal date,kas_awal numeric,status text,dibuka_pada timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v public.kas_sesi%rowtype;
begin
  if not public.kasir_is_owner_or_admin() then
    raise exception 'Hanya owner/admin yang boleh membuka kas.';
  end if;
  if p_kas_awal is null or p_kas_awal < 0 then
    raise exception 'Kas awal tidak valid.';
  end if;

  select * into v
  from public.kas_sesi ks
  where ks.tanggal=p_tanggal
  order by ks.dibuka_pada desc
  limit 1
  for update;

  if found then
    if v.status='OPEN' then
      raise exception 'Kas untuk tanggal tersebut sudah terbuka.';
    end if;

    if round(p_kas_awal,2) <> round(coalesce(v.kas_sistem,0),2) then
      raise exception 'Untuk membuka kembali kas hari ini, masukkan kas sistem terakhir: %.', round(coalesce(v.kas_sistem,0),2);
    end if;

    update public.kas_sesi
    set status='OPEN',
        kas_fisik=null,
        selisih=null,
        ditutup_pada=null,
        ditutup_oleh=null,
        updated_at=now(),
        catatan=coalesce(nullif(trim(p_catatan),''),catatan)
    where id=v.id
    returning * into v;

    return query select v.id,v.tanggal,v.kas_awal,v.status,v.dibuka_pada;
    return;
  end if;

  insert into public.kas_sesi(tanggal,kas_awal,kas_masuk,kas_keluar,kas_sistem,status,dibuka_oleh,catatan)
  values(p_tanggal,round(p_kas_awal,2),0,0,round(p_kas_awal,2),'OPEN',auth.uid(),nullif(trim(p_catatan),''))
  returning * into v;

  return query select v.id,v.tanggal,v.kas_awal,v.status,v.dibuka_pada;
end;
$function$;

revoke execute on function public.kasir_buka_kas_sesi(date,numeric,text) from public,anon;
grant execute on function public.kasir_buka_kas_sesi(date,numeric,text) to authenticated;
