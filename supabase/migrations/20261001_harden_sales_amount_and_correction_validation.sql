create or replace function public.kasir_input_penjualan(p_produk_id uuid, p_jumlah numeric, p_metode_pembayaran_id bigint, p_nominal numeric default null, p_catatan text default null)
returns table(transaksi_id uuid, nomor_transaksi text, total numeric, produk text)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_operator bigint; v_kas uuid; v_date date; v_now timestamptz:=now();
  v_counter bigint; v_no text; v_tx uuid; v_product text; v_price numeric;
  v_total numeric;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  if p_jumlah is null or p_jumlah<=0 then raise exception 'Jumlah produk harus lebih dari 0.'; end if;
  select os.staff_id into v_operator from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true;
  if v_operator is null then raise exception 'Pilih nama PJ/Kasir terlebih dahulu.'; end if;
  select name,selling_price into v_product,v_price from public.pmb_products where id=p_produk_id and is_active=true;
  if v_product is null then raise exception 'Produk tidak valid atau tidak aktif.'; end if;
  v_total:=round(v_price*p_jumlah,2);
  if p_nominal is not null and round(p_nominal,2)<>v_total then raise exception 'Nominal penjualan harus sama dengan total harga produk: %.',v_total; end if;
  v_date:=(v_now at time zone 'Asia/Jakarta')::date;
  select id into v_kas from public.kas_sesi where tanggal=v_date and status='OPEN' limit 1 for update;
  if v_kas is null then raise exception 'Kas hari ini belum dibuka.'; end if;
  if not exists(select 1 from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
  insert into public.transaksi_nomor_counter(tanggal,nomor) values(v_date,1)
    on conflict(tanggal) do update set nomor=public.transaksi_nomor_counter.nomor+1 returning nomor into v_counter;
  v_no:='TRX-'||to_char(v_date,'DDMMYY')||'-'||lpad(v_counter::text,4,'0');
  insert into public.transaksi(nomor_transaksi,tanggal_transaksi,jenis,subjenis,kategori_id,penanggung_jawab_id,operator_id,metode_pembayaran_id,nominal,catatan,status,kas_sesi_id,produk_id,jumlah_produk)
  values(v_no,v_now,'PEMASUKAN','PENJUALAN',9,v_operator,v_operator,p_metode_pembayaran_id,v_total,coalesce(nullif(trim(p_catatan),''),'Penjualan '||v_product),'AKTIF',v_kas,p_produk_id,p_jumlah)
  returning id into v_tx;
  return query select v_tx,v_no,v_total,v_product;
end;
$function$;

create or replace function public.kasir_koreksi_transaksi_saya(
  p_transaksi_id uuid,
  p_nama_pasien text default null,
  p_umur integer default null,
  p_kategori_id bigint default null,
  p_pelaksana_id bigint default null,
  p_metode_pembayaran_id bigint default null,
  p_nominal numeric default null,
  p_catatan text default null,
  p_produk_id uuid default null,
  p_jumlah_produk numeric default null
)
returns public.transaksi
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v public.transaksi;
  v_operator bigint;
  v_before jsonb;
  v_after jsonb;
  v_kas_status text;
  v_product text;
  v_price numeric;
  v_expected numeric;
  v_new_cat bigint;
  v_new_pel bigint;
  v_new_method bigint;
  v_new_note text;
begin
  if auth.uid() is null then raise exception 'Sesi belum login.'; end if;
  select os.staff_id into v_operator from public.kasir_operator_sessions os where os.user_id=(select auth.uid()) and os.aktif=true limit 1;
  if v_operator is null then raise exception 'PJ belum dipilih.'; end if;
  select * into v from public.transaksi where id=p_transaksi_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan.'; end if;
  if v.operator_id<>v_operator then raise exception 'Anda hanya dapat memperbaiki transaksi yang Anda input.'; end if;
  if v.status<>'AKTIF' then raise exception 'Transaksi sudah tidak aktif.'; end if;
  if (v.tanggal_transaksi at time zone 'Asia/Jakarta')::date<>(now() at time zone 'Asia/Jakarta')::date then raise exception 'Koreksi hanya dapat dilakukan pada transaksi hari ini.'; end if;
  select ks.status into v_kas_status from public.kas_sesi ks where ks.id=v.kas_sesi_id for update;
  if v_kas_status is distinct from 'OPEN' then raise exception 'Kas sudah ditutup. Koreksi tidak diperbolehkan.'; end if;
  if v.subjenis='PELAYANAN' then
    if nullif(trim(coalesce(p_nama_pasien,'')),'') is null then raise exception 'Nama pasien wajib diisi.'; end if;
    if p_umur is null or p_umur<0 or p_umur>130 then raise exception 'Umur pasien tidak valid.'; end if;
    if p_kategori_id is null or not exists(select 1 from public.kategori_kasir where id=p_kategori_id and jenis='PEMASUKAN' and aktif=true) then raise exception 'Pelayanan tidak valid.'; end if;
    if p_pelaksana_id is null or not exists(select 1 from public.staff where id=p_pelaksana_id and aktif=true) then raise exception 'Pelaksana tidak valid.'; end if;
    if p_metode_pembayaran_id is null or not exists(select 1 from public.metode_pembayaran where id=p_metode_pembayaran_id and aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
    if p_nominal is null or p_nominal<=0 then raise exception 'Nominal harus lebih besar dari 0.'; end if;
    v_new_cat:=p_kategori_id; v_new_pel:=p_pelaksana_id; v_new_method:=p_metode_pembayaran_id; v_new_note:=case when p_catatan is null then v.catatan else nullif(trim(p_catatan),'') end;
  elsif v.subjenis='PENJUALAN' then
    if p_produk_id is null or p_jumlah_produk is null or p_jumlah_produk<=0 then raise exception 'Produk dan jumlah penjualan wajib valid.'; end if;
    select name,selling_price into v_product,v_price from public.pmb_products where id=p_produk_id and is_active=true;
    if v_product is null then raise exception 'Produk tidak valid atau tidak aktif.'; end if;
    if p_metode_pembayaran_id is null or not exists(select 1 from public.metode_pembayaran where id=p_metode_pembayaran_id and aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
    v_expected:=round(v_price*p_jumlah_produk,2);
    if p_nominal is null or round(p_nominal,2)<>v_expected then raise exception 'Nominal penjualan harus sama dengan total harga produk: %.',v_expected; end if;
    v_new_cat:=v.kategori_id; v_new_pel:=v.operator_id; v_new_method:=p_metode_pembayaran_id; v_new_note:=case when p_catatan is null then v.catatan else nullif(trim(p_catatan),'') end;
  elsif v.subjenis='PENGELUARAN' then
    if p_kategori_id is null or not exists(select 1 from public.kategori_kasir where id=p_kategori_id and jenis='PENGELUARAN' and aktif=true) then raise exception 'Kategori pengeluaran tidak valid.'; end if;
    if p_metode_pembayaran_id is null or not exists(select 1 from public.metode_pembayaran where id=p_metode_pembayaran_id and aktif=true) then raise exception 'Metode pembayaran tidak valid.'; end if;
    if p_nominal is null or p_nominal<=0 then raise exception 'Nominal harus lebih besar dari 0.'; end if;
    v_new_cat:=p_kategori_id; v_new_pel:=v.operator_id; v_new_method:=p_metode_pembayaran_id; v_new_note:=case when p_catatan is null then v.catatan else nullif(trim(p_catatan),'') end;
    if nullif(trim(coalesce(v_new_note,'')),'') is null then raise exception 'Keterangan pengeluaran wajib diisi.'; end if;
  else
    raise exception 'Jenis transaksi tidak dapat dikoreksi oleh PJ.';
  end if;
  v_before:=to_jsonb(v);
  update public.transaksi set
    nama_pasien=case when v.subjenis='PELAYANAN' then trim(p_nama_pasien) else nama_pasien end,
    umur_pasien=case when v.subjenis='PELAYANAN' then p_umur else umur_pasien end,
    kategori_id=v_new_cat,
    penanggung_jawab_id=v_new_pel,
    metode_pembayaran_id=v_new_method,
    nominal=round(p_nominal,2),
    catatan=v_new_note,
    produk_id=case when v.subjenis='PENJUALAN' then p_produk_id else produk_id end,
    jumlah_produk=case when v.subjenis='PENJUALAN' then round(p_jumlah_produk,2) else jumlah_produk end,
    updated_at=now()
  where id=p_transaksi_id returning * into v;
  if v.subjenis='PELAYANAN' then
    update public.logbook_pasien set nama_pasien=v.nama_pasien,umur=v.umur_pasien,pelayanan=(select nama from public.kategori_kasir where id=v.kategori_id),pelaksana_id=v.penanggung_jawab_id,operator_id=v.operator_id where transaksi_id=v.id;
  end if;
  v_after:=to_jsonb(v);
  insert into public.audit_log(admin_id,aksi,tabel,record_id,data_sebelum,data_sesudah,alasan)
  values(null,'KOREKSI_TRANSAKSI','transaksi',v.id::text,v_before,v_after,'Koreksi oleh PJ/Kasir');
  return v;
end;
$function$;
