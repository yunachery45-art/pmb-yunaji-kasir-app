create or replace function public.kasir_buka_kas_sesi(p_tanggal date,p_kas_awal numeric,p_catatan text default null)
returns table(session_id uuid,tanggal date,kas_awal numeric,status text,dibuka_pada timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v public.kas_sesi%rowtype;
begin
  if not public.kasir_is_owner_or_admin() then raise exception 'Hanya owner/admin yang boleh membuka kas.'; end if;
  if p_kas_awal is null or p_kas_awal < 0 then raise exception 'Kas awal tidak valid.'; end if;
  if exists (select 1 from public.kas_sesi ks where ks.tanggal=p_tanggal and ks.status='OPEN') then raise exception 'Kas untuk tanggal tersebut sudah dibuka.'; end if;
  insert into public.kas_sesi(tanggal,kas_awal,kas_masuk,kas_keluar,kas_sistem,status,dibuka_oleh,catatan)
  values(p_tanggal,round(p_kas_awal,2),0,0,round(p_kas_awal,2),'OPEN',auth.uid(),nullif(trim(p_catatan),''))
  returning * into v;
  return query select v.id,v.tanggal,v.kas_awal,v.status,v.dibuka_pada;
end;
$function$;

create or replace function public.kasir_tutup_kas_sesi(p_tanggal date,p_kas_fisik numeric,p_catatan text default null)
returns table(session_id uuid,tanggal date,kas_awal numeric,kas_masuk numeric,kas_keluar numeric,kas_sistem numeric,kas_fisik numeric,selisih numeric,status text,ditutup_pada timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_session public.kas_sesi%rowtype; v_fisik numeric; v_selisih numeric;
begin
  if not public.kasir_is_owner_or_admin() then raise exception 'Hanya owner/admin yang boleh menutup kas.'; end if;
  if p_kas_fisik is null or p_kas_fisik < 0 then raise exception 'Kas fisik tidak valid.'; end if;
  select ks.* into v_session from public.kas_sesi ks where ks.tanggal=p_tanggal and ks.status='OPEN' order by ks.dibuka_pada desc limit 1 for update;
  if not found then raise exception 'Kas untuk tanggal tersebut tidak ditemukan atau sudah ditutup.'; end if;
  v_fisik:=round(p_kas_fisik,2); v_selisih:=v_fisik-coalesce(v_session.kas_sistem,0);
  if v_selisih<>0 and nullif(trim(coalesce(p_catatan,'')),'') is null then raise exception 'Kas memiliki selisih %. Catatan wajib diisi.',v_selisih; end if;
  update public.kas_sesi ks set kas_fisik=v_fisik,selisih=v_selisih,status='CLOSED',ditutup_pada=now(),ditutup_oleh=auth.uid(),catatan=coalesce(nullif(trim(p_catatan),''),ks.catatan),updated_at=now() where ks.id=v_session.id returning ks.* into v_session;
  return query select v_session.id,v_session.tanggal,v_session.kas_awal,v_session.kas_masuk,v_session.kas_keluar,v_session.kas_sistem,v_session.kas_fisik,v_session.selisih,v_session.status,v_session.ditutup_pada;
end;
$function$;

create or replace function public.kasir_dashboard_hari_ini()
returns table(jumlah_transaksi bigint,total_pemasukan numeric,total_pengeluaran numeric,saldo_transaksi numeric,kas_awal numeric,kas_masuk_cash numeric,kas_keluar_cash numeric,kas_sistem numeric,status_kas text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.kasir_is_owner_or_admin() then raise exception 'Akses dashboard owner ditolak.'; end if;
  return query
  with today as (select * from public.kas_sesi where tanggal=(now() at time zone 'Asia/Jakarta')::date order by dibuka_pada desc limit 1),
  tx as (select count(*) filter(where t.status='AKTIF')::bigint as jumlah,coalesce(sum(t.nominal) filter(where t.jenis='PEMASUKAN' and t.status='AKTIF'),0) as pemasukan,coalesce(sum(t.nominal) filter(where t.jenis='PENGELUARAN' and t.status='AKTIF'),0) as pengeluaran,coalesce(sum(t.nominal) filter(where t.jenis='PEMASUKAN' and t.status='AKTIF' and m.kode='CASH'),0) as cash_in,coalesce(sum(t.nominal) filter(where t.jenis='PENGELUARAN' and t.status='AKTIF' and m.kode='CASH'),0) as cash_out from public.transaksi t left join public.metode_pembayaran m on m.id=t.metode_pembayaran_id where (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date=(now() at time zone 'Asia/Jakarta')::date)
  select tx.jumlah,tx.pemasukan,tx.pengeluaran,tx.pemasukan-tx.pengeluaran,coalesce(today.kas_awal,0),tx.cash_in,tx.cash_out,coalesce(today.kas_sistem,0),coalesce(today.status,'BELUM_DIBUKA') from tx left join today on true;
end;
$function$;

create or replace function public.kasir_riwayat_hari_ini()
returns table(id uuid,nomor_transaksi text,tanggal_transaksi timestamptz,jenis text,kategori text,penanggung_jawab text,metode_pembayaran text,nominal numeric,catatan text,status text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.kasir_is_owner_or_admin() then raise exception 'Akses riwayat transaksi owner ditolak.'; end if;
  return query select t.id,t.nomor_transaksi,t.tanggal_transaksi,t.jenis,k.nama,s.nama,m.nama,t.nominal,t.catatan,t.status from public.transaksi t join public.kategori_kasir k on k.id=t.kategori_id join public.staff s on s.id=t.penanggung_jawab_id join public.metode_pembayaran m on m.id=t.metode_pembayaran_id where (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date=(now() at time zone 'Asia/Jakarta')::date order by t.tanggal_transaksi desc limit 50;
end;
$function$;

create or replace function public.kasir_status_kas()
returns table(session_id uuid,tanggal date,kas_awal numeric,kas_masuk numeric,kas_keluar numeric,kas_sistem numeric,status text,dibuka_pada timestamptz,ditutup_pada timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.kasir_is_owner_or_admin() then raise exception 'Akses status kas owner ditolak.'; end if;
  return query select ks.id,ks.tanggal,ks.kas_awal,ks.kas_masuk,ks.kas_keluar,ks.kas_sistem,ks.status,ks.dibuka_pada,ks.ditutup_pada from public.kas_sesi ks where ks.tanggal=(now() at time zone 'Asia/Jakarta')::date order by ks.dibuka_pada desc limit 1;
end;
$function$;