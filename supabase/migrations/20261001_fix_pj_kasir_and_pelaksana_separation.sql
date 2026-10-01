-- Fix role semantics: the selected PJ/Kasir owns the transaction; Pelaksana is a separate field.
-- The legacy operator_id column is retained internally for compatibility, but it stores the active PJ/Kasir identity.

create or replace function public.kasir_input_pelayanan(
  p_nama_pasien text,p_umur integer,p_kategori_id bigint,p_pelaksana_id bigint,
  p_metode_pembayaran_id bigint,p_nominal numeric,p_catatan text default null
)
returns table(transaksi_id uuid, nomor_transaksi text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_pj bigint; v_kas uuid; v_date date; v_cat text; v_pel text; v_counter bigint; v_no text; v_tx uuid; v_now timestamptz:=now();
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if nullif(trim(coalesce(p_nama_pasien,'')),'') is null then raise exception 'Nama pasien wajib diisi.'; end if;
  if p_umur is null or p_umur<0 or p_umur>130 then raise exception 'Umur pasien tidak valid.'; end if;
  if p_nominal is null or p_nominal<=0 then raise exception 'Nominal harus lebih besar dari 0.'; end if;
  select os.staff_id into v_pj from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true;
  if v_pj is null then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  v_date:=(v_now at time zone 'Asia/Jakarta')::date;
  select id into v_kas from public.kas_sesi where tanggal=v_date and status='OPEN' limit 1 for update;
  if v_kas is null then raise exception 'Kas hari ini belum dibuka.'; end if;
  select k.nama into v_cat from public.kategori_kasir k where k.id=p_kategori_id and k.aktif=true and k.jenis='PEMASUKAN';
  if v_cat is null then raise exception 'Kategori pelayanan tidak valid.'; end if;
  select s.nama into v_pel from public.staff s where s.id=p_pelaksana_id and s.aktif=true;
  if v_pel is null then raise exception 'Pelaksana tidak valid.'; end if;
  if not exists(select 1 from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
  insert into public.transaksi_nomor_counter(tanggal,nomor) values(v_date,1) on conflict(tanggal) do update set nomor=public.transaksi_nomor_counter.nomor+1 returning nomor into v_counter;
  v_no:='TRX-'||to_char(v_date,'DDMMYY')||'-'||lpad(v_counter::text,4,'0');
  insert into public.transaksi(nomor_transaksi,tanggal_transaksi,jenis,subjenis,kategori_id,penanggung_jawab_id,operator_id,metode_pembayaran_id,nominal,catatan,status,kas_sesi_id,nama_pasien,umur_pasien)
  values(v_no,v_now,'PEMASUKAN','PELAYANAN',p_kategori_id,v_pj,v_pj,p_metode_pembayaran_id,round(p_nominal,2),nullif(trim(p_catatan),''),'AKTIF',v_kas,trim(p_nama_pasien),p_umur) returning id into v_tx;
  insert into public.logbook_pasien(transaksi_id,nama_pasien,umur,pelayanan,pelaksana_id,operator_id,tanggal_waktu)
  values(v_tx,trim(p_nama_pasien),p_umur,v_cat,p_pelaksana_id,v_pj,v_now);
  return query select v_tx,v_no;
end;
$function$;

grant execute on function public.kasir_input_pelayanan(text,integer,bigint,bigint,bigint,numeric,text) to authenticated;

create or replace function public.kasir_input_penjualan(p_produk_id uuid,p_jumlah numeric,p_metode_pembayaran_id bigint,p_nominal numeric default null,p_catatan text default null)
returns table(transaksi_id uuid, nomor_transaksi text, total numeric, produk text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_pj bigint; v_kas uuid; v_date date; v_now timestamptz:=now(); v_counter bigint; v_no text; v_tx uuid; v_product text; v_price numeric; v_total numeric;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if p_jumlah is null or p_jumlah<=0 then raise exception 'Jumlah produk harus lebih dari 0.'; end if;
  select os.staff_id into v_pj from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true;
  if v_pj is null then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  select name,selling_price into v_product,v_price from public.pmb_products where id=p_produk_id and is_active=true;
  if v_product is null then raise exception 'Produk tidak valid atau tidak aktif.'; end if;
  v_total:=round(v_price*p_jumlah,2);
  if p_nominal is not null and round(p_nominal,2)<>v_total then raise exception 'Nominal penjualan harus sama dengan total harga produk: %.',v_total; end if;
  v_date:=(v_now at time zone 'Asia/Jakarta')::date;
  select id into v_kas from public.kas_sesi where tanggal=v_date and status='OPEN' limit 1 for update;
  if v_kas is null then raise exception 'Kas hari ini belum dibuka.'; end if;
  if not exists(select 1 from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
  insert into public.transaksi_nomor_counter(tanggal,nomor) values(v_date,1) on conflict(tanggal) do update set nomor=public.transaksi_nomor_counter.nomor+1 returning nomor into v_counter;
  v_no:='TRX-'||to_char(v_date,'DDMMYY')||'-'||lpad(v_counter::text,4,'0');
  insert into public.transaksi(nomor_transaksi,tanggal_transaksi,jenis,subjenis,kategori_id,penanggung_jawab_id,operator_id,metode_pembayaran_id,nominal,catatan,status,kas_sesi_id,produk_id,jumlah_produk)
  values(v_no,v_now,'PEMASUKAN','PENJUALAN',9,v_pj,v_pj,p_metode_pembayaran_id,v_total,coalesce(nullif(trim(p_catatan),''),'Penjualan '||v_product),'AKTIF',v_kas,p_produk_id,p_jumlah) returning id into v_tx;
  return query select v_tx,v_no,v_total,v_product;
end;
$function$;

grant execute on function public.kasir_input_penjualan(uuid,numeric,bigint,numeric,text) to authenticated;

create or replace function public.kasir_input_pengeluaran(p_kategori_id bigint,p_metode_pembayaran_id bigint,p_nominal numeric,p_catatan text)
returns table(transaksi_id uuid, nomor_transaksi text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_pj bigint; v_kas uuid; v_date date; v_now timestamptz:=now(); v_counter bigint; v_no text; v_tx uuid;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if p_nominal is null or p_nominal<=0 then raise exception 'Nominal harus lebih besar dari 0.'; end if;
  if nullif(trim(coalesce(p_catatan,'')),'') is null then raise exception 'Keterangan pengeluaran wajib diisi.'; end if;
  select os.staff_id into v_pj from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true;
  if v_pj is null then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  v_date:=(v_now at time zone 'Asia/Jakarta')::date;
  select id into v_kas from public.kas_sesi where tanggal=v_date and status='OPEN' limit 1 for update;
  if v_kas is null then raise exception 'Kas hari ini belum dibuka.'; end if;
  if not exists(select 1 from public.kategori_kasir k where k.id=p_kategori_id and k.aktif=true and k.jenis='PENGELUARAN') then raise exception 'Kategori pengeluaran tidak valid.'; end if;
  if not exists(select 1 from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
  insert into public.transaksi_nomor_counter(tanggal,nomor) values(v_date,1) on conflict(tanggal) do update set nomor=public.transaksi_nomor_counter.nomor+1 returning nomor into v_counter;
  v_no:='TRX-'||to_char(v_date,'DDMMYY')||'-'||lpad(v_counter::text,4,'0');
  insert into public.transaksi(nomor_transaksi,tanggal_transaksi,jenis,subjenis,kategori_id,penanggung_jawab_id,operator_id,metode_pembayaran_id,nominal,catatan,status,kas_sesi_id)
  values(v_no,v_now,'PENGELUARAN','PENGELUARAN',p_kategori_id,v_pj,v_pj,p_metode_pembayaran_id,round(p_nominal,2),trim(p_catatan),'AKTIF',v_kas) returning id into v_tx;
  return query select v_tx,v_no;
end;
$function$;

grant execute on function public.kasir_input_pengeluaran(bigint,bigint,numeric,text) to authenticated;

create or replace function public.kasir_rekap_saya_detail()
returns table(waktu text, jenis text, keterangan text, operator text, pelaksana text)
language sql security definer set search_path to 'public','pg_temp'
as $function$
  with me as (select os.staff_id from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true limit 1)
  select to_char(t.tanggal_transaksi at time zone 'Asia/Jakarta','HH24:MI'),t.subjenis,coalesce(t.nama_pasien,t.catatan,''),pj.nama,pl.nama
  from public.transaksi t cross join me join public.staff pj on pj.id=t.penanggung_jawab_id
  left join public.staff pl on pl.id=(select l.pelaksana_id from public.logbook_pasien l where l.transaksi_id=t.id limit 1)
  where (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date=(now() at time zone 'Asia/Jakarta')::date and t.status='AKTIF' and t.penanggung_jawab_id=me.staff_id
  order by t.tanggal_transaksi desc;
$function$;

grant execute on function public.kasir_rekap_saya_detail() to authenticated;

create or replace function public.kasir_rekap_saya_logbook()
returns table(jam text,nama_pasien text,umur integer,pelayanan text,pelaksana text,status text)
language sql security definer set search_path to 'public','pg_temp'
as $function$
  with me as (select os.staff_id from public.kasir_operator_sessions os where os.user_id=auth.uid() and os.aktif=true limit 1)
  select to_char(l.tanggal_waktu at time zone 'Asia/Jakarta','HH24:MI'),l.nama_pasien,l.umur,l.pelayanan,s.nama,'AKTIF'::text
  from public.logbook_pasien l join me on me.staff_id=l.pelaksana_id join public.staff s on s.id=l.pelaksana_id
  where (l.tanggal_waktu at time zone 'Asia/Jakarta')::date=(now() at time zone 'Asia/Jakarta')::date
  order by l.tanggal_waktu desc;
$function$;

grant execute on function public.kasir_rekap_saya_logbook() to authenticated;
revoke execute on function public.kasir_rekap_saya_logbook() from anon, public;
