-- Fix: CASH was being added twice because both kasir_input_transaksi and
-- trg_transaksi_update_kas_sesi updated kas_sesi. The trigger is now the single
-- source of truth for physical-cash movement.

create or replace function public.kasir_input_transaksi(p_jenis text, p_kategori_id bigint, p_penanggung_jawab_id bigint, p_metode_pembayaran_id bigint, p_nominal numeric, p_catatan text default null)
returns table(transaksi_id uuid, nomor_transaksi text, tanggal_transaksi timestamptz, jenis text, kategori text, penanggung_jawab text, metode_pembayaran text, nominal numeric, status text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_jenis text; v_tanggal date; v_waktu timestamptz; v_kategori text; v_kategori_jenis text;
  v_pj text; v_metode text; v_kode_metode text; v_butuh_pelunasan boolean;
  v_counter bigint; v_nomor text; v_id uuid; v_kas_sesi_id uuid;
begin
  v_jenis := upper(trim(coalesce(p_jenis,'')));
  v_waktu := now();
  v_tanggal := (v_waktu at time zone 'Asia/Jakarta')::date;
  if v_jenis not in ('PEMASUKAN','PENGELUARAN') then raise exception 'Jenis transaksi tidak valid.'; end if;
  if p_nominal is null or p_nominal <= 0 then raise exception 'Nominal harus lebih besar dari 0.'; end if;
  select ks.id into v_kas_sesi_id from public.kas_sesi ks where ks.tanggal=v_tanggal and ks.status='OPEN' order by ks.dibuka_pada desc limit 1 for update;
  if v_kas_sesi_id is null then raise exception 'Kas hari ini belum dibuka. Silakan buka Kas Harian terlebih dahulu.'; end if;
  select s.nama into v_pj from public.staff s where s.id=p_penanggung_jawab_id and s.aktif=true;
  if v_pj is null then raise exception 'Penanggung jawab tidak valid atau tidak aktif.'; end if;
  select k.nama,k.jenis into v_kategori,v_kategori_jenis from public.kategori_kasir k where k.id=p_kategori_id and k.aktif=true;
  if v_kategori is null then raise exception 'Kategori tidak valid atau tidak aktif.'; end if;
  if v_kategori_jenis <> v_jenis then raise exception 'Kategori tidak sesuai dengan jenis transaksi.'; end if;
  select m.nama,m.kode,m.butuh_pelunasan into v_metode,v_kode_metode,v_butuh_pelunasan from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true;
  if v_metode is null then raise exception 'Metode pembayaran tidak valid atau tidak aktif.'; end if;
  if v_kode_metode='HUTANG' and v_jenis<>'PEMASUKAN' then raise exception 'Metode HUTANG hanya dapat digunakan untuk pemasukan.'; end if;
  insert into public.transaksi_nomor_counter(tanggal,nomor) values(v_tanggal,1)
  on conflict(tanggal) do update set nomor=public.transaksi_nomor_counter.nomor+1 returning nomor into v_counter;
  v_nomor := 'TRX-'||to_char(v_tanggal,'DDMMYY')||'-'||lpad(v_counter::text,4,'0');
  insert into public.transaksi(nomor_transaksi,tanggal_transaksi,jenis,kategori_id,penanggung_jawab_id,metode_pembayaran_id,nominal,catatan,status,kas_sesi_id)
  values(v_nomor,v_waktu,v_jenis,p_kategori_id,p_penanggung_jawab_id,p_metode_pembayaran_id,round(p_nominal,2),nullif(trim(p_catatan),''),'AKTIF',v_kas_sesi_id)
  returning id into v_id;
  return query select t.id,t.nomor_transaksi,t.tanggal_transaksi,t.jenis,k.nama,s.nama,m.nama,t.nominal,t.status
  from public.transaksi t join public.kategori_kasir k on k.id=t.kategori_id join public.staff s on s.id=t.penanggung_jawab_id join public.metode_pembayaran m on m.id=t.metode_pembayaran_id where t.id=v_id;
end;
$function$;

create or replace function public.kasir_laporan_periode(p_mulai date,p_selesai date)
returns table(tanggal date,pemasukan numeric,pengeluaran numeric,saldo numeric,jumlah_transaksi bigint)
language sql stable security definer set search_path to 'public'
as $function$
  select d.tanggal,
    coalesce(sum(case when upper(t.jenis)='PEMASUKAN' then t.nominal else 0 end),0),
    coalesce(sum(case when upper(t.jenis)='PENGELUARAN' then t.nominal else 0 end),0),
    coalesce(sum(case when upper(t.jenis)='PEMASUKAN' then t.nominal when upper(t.jenis)='PENGELUARAN' then -t.nominal else 0 end),0),
    count(t.id) filter (where t.status='AKTIF')
  from generate_series(p_mulai,p_selesai,interval '1 day') g(d)
  cross join lateral (select g.d::date as tanggal) d
  left join public.transaksi t on (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date=d.tanggal and t.status='AKTIF'
  where public.kasir_is_owner_or_admin()
  group by d.tanggal order by d.tanggal;
$function$;

create or replace function public.kasir_status_kas()
returns table(session_id uuid,tanggal date,kas_awal numeric,kas_masuk numeric,kas_keluar numeric,kas_sistem numeric,status text,dibuka_pada timestamptz,ditutup_pada timestamptz)
language sql stable security definer set search_path to 'public'
as $function$
  select ks.id,ks.tanggal,ks.kas_awal,ks.kas_masuk,ks.kas_keluar,ks.kas_sistem,ks.status,ks.dibuka_pada,ks.ditutup_pada
  from public.kas_sesi ks where ks.tanggal=(now() at time zone 'Asia/Jakarta')::date order by ks.dibuka_pada desc limit 1;
$function$;
