-- Final hardening applied to the connected Supabase project on 2026-10-01.

-- Admin cash report: use actual admin_profiles.display_name column.
create or replace function public.kasir_admin_kas_hari_ini()
returns table(kas_id uuid,tanggal date,kas_awal numeric,kas_masuk numeric,kas_keluar numeric,kas_sistem numeric,kas_fisik numeric,selisih numeric,status text,dibuka_pada timestamptz,ditutup_pada timestamptz,dibuka_oleh text,ditutup_oleh text)
language plpgsql security definer set search_path to 'public','pg_temp' as $function$
begin
 if not public.kasir_is_admin() then raise exception 'Akses admin diperlukan.'; end if;
 return query select ks.id,ks.tanggal,ks.kas_awal,ks.kas_masuk,ks.kas_keluar,ks.kas_sistem,ks.kas_fisik,ks.selisih,ks.status,ks.dibuka_pada,ks.ditutup_pada,coalesce(op.display_name,ou.nama),coalesce(cp.display_name,cu.nama)
 from public.kas_sesi ks left join public.admin_profiles op on op.user_id=ks.dibuka_oleh left join public.admin ou on ou.auth_user_id=ks.dibuka_oleh left join public.admin_profiles cp on cp.user_id=ks.ditutup_oleh left join public.admin cu on cu.auth_user_id=ks.ditutup_oleh
 where ks.tanggal=(now() at time zone 'Asia/Jakarta')::date order by ks.dibuka_pada desc limit 1;
end;$function$;
grant execute on function public.kasir_admin_kas_hari_ini() to authenticated;
revoke execute on function public.kasir_admin_kas_hari_ini() from anon;

-- Same-day PJ handover: active authenticated operator only; no direct table access.
drop function if exists public.kasir_ambil_alih_pj(bigint);
create function public.kasir_ambil_alih_pj(p_staff_id bigint) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_kas public.kas_sesi%rowtype; v_user uuid; v_old bigint; v_name text;
begin
 v_user:=auth.uid(); if v_user is null then raise exception 'Sesi login tidak ditemukan.'; end if;
 select s.nama into v_name from public.staff s where s.id=p_staff_id and s.aktif=true; if v_name is null then raise exception 'PJ tidak valid atau tidak aktif.'; end if;
 if not exists(select 1 from public.kasir_operator_sessions os where os.user_id=v_user and os.aktif=true) then raise exception 'Pilih PJ/Kasir terlebih dahulu sebelum mengambil alih kas.'; end if;
 select * into v_kas from public.kas_sesi where tanggal=(now() at time zone 'Asia/Jakarta')::date and status='OPEN' limit 1 for update; if not found then raise exception 'Kas hari ini belum dibuka atau sudah ditutup.'; end if;
 select staff_id into v_old from public.kas_sesi_pj where kas_sesi_id=v_kas.id and selesai is null order by mulai desc limit 1;
 update public.kas_sesi_pj set selesai=now() where kas_sesi_id=v_kas.id and selesai is null;
 insert into public.kas_sesi_pj(kas_sesi_id,staff_id) values(v_kas.id,p_staff_id);
 update public.kasir_operator_sessions set staff_id=p_staff_id,aktif=true,updated_at=now() where user_id=v_user;
 return jsonb_build_object('ok',true,'previous_staff_id',v_old,'staff_id',p_staff_id,'staff_name',v_name,'kas_sesi_id',v_kas.id);
end;$function$;
grant execute on function public.kasir_ambil_alih_pj(bigint) to authenticated;
revoke execute on function public.kasir_ambil_alih_pj(bigint) from anon;
revoke all on table public.kas_sesi_pj from anon,authenticated;
alter table public.kas_sesi_pj enable row level security;

-- Cash reconciliation: corrections/payment-method changes must update the cash session.
create or replace function public.kasir_update_sesi_setelah_transaksi() returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_old_cash boolean:=false; v_new_cash boolean:=false; v_old_method text; v_new_method text; v_rows integer;
begin
 if tg_op<>'INSERT' then select upper(trim(m.kode)) into v_old_method from public.metode_pembayaran m where m.id=old.metode_pembayaran_id; v_old_cash:=old.status='AKTIF' and v_old_method='CASH'; end if;
 if tg_op<>'DELETE' then select upper(trim(m.kode)) into v_new_method from public.metode_pembayaran m where m.id=new.metode_pembayaran_id; v_new_cash:=new.status='AKTIF' and v_new_method='CASH'; end if;
 if v_old_cash then
  if old.kas_sesi_id is null then raise exception 'Transaksi CASH tidak memiliki sesi kas.'; end if;
  if old.jenis='PEMASUKAN' then update public.kas_sesi set kas_masuk=coalesce(kas_masuk,0)-old.nominal,kas_sistem=coalesce(kas_awal,0)+(coalesce(kas_masuk,0)-old.nominal)-coalesce(kas_keluar,0),updated_at=now() where id=old.kas_sesi_id and status='OPEN';
  elsif old.jenis='PENGELUARAN' then update public.kas_sesi set kas_keluar=coalesce(kas_keluar,0)-old.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)-(coalesce(kas_keluar,0)-old.nominal),updated_at=now() where id=old.kas_sesi_id and status='OPEN'; end if;
  get diagnostics v_rows=row_count; if v_rows=0 then raise exception 'Transaksi CASH tidak dapat diubah karena sesi kas sudah ditutup.'; end if;
 end if;
 if v_new_cash then
  if new.kas_sesi_id is null then raise exception 'Transaksi CASH wajib terikat ke sesi kas.'; end if;
  if new.jenis='PEMASUKAN' then update public.kas_sesi set kas_masuk=coalesce(kas_masuk,0)+new.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)+new.nominal-coalesce(kas_keluar,0),updated_at=now() where id=new.kas_sesi_id and status='OPEN';
  elsif new.jenis='PENGELUARAN' then update public.kas_sesi set kas_keluar=coalesce(kas_keluar,0)+new.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)-coalesce(kas_keluar,0)-new.nominal,updated_at=now() where id=new.kas_sesi_id and status='OPEN'; end if;
  get diagnostics v_rows=row_count; if v_rows=0 then raise exception 'Sesi kas tidak ditemukan atau sudah ditutup.'; end if;
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end;$function$;
drop trigger if exists trg_transaksi_update_kas_sesi on public.transaksi;
create trigger trg_transaksi_update_kas_sesi after insert or update or delete on public.transaksi for each row execute function public.kasir_update_sesi_setelah_transaksi();

-- Inventory: sale consumes stock; correction and cancellation restore/reapply stock atomically.
create or replace function public.kasir_update_stock_after_transaksi() returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_old_qty numeric:=case when tg_op='INSERT' then 0 else coalesce(old.jumlah_produk,0) end; v_new_qty numeric:=case when tg_op='DELETE' then 0 else coalesce(new.jumlah_produk,0) end; v_old_active boolean:=tg_op<>'INSERT' and old.status='AKTIF' and old.subjenis='PENJUALAN' and old.produk_id is not null and coalesce(old.jumlah_produk,0)>0; v_new_active boolean:=tg_op<>'DELETE' and new.status='AKTIF' and new.subjenis='PENJUALAN' and new.produk_id is not null and coalesce(new.jumlah_produk,0)>0; v_stock numeric; v_delta numeric;
begin
 if v_old_active and v_new_active and old.produk_id=new.produk_id then v_delta:=v_old_qty-v_new_qty; if v_delta<>0 then select stock into v_stock from public.pmb_products where id=new.produk_id for update; if v_stock is null or v_stock+v_delta<0 then raise exception 'Stok produk tidak mencukupi.'; end if; update public.pmb_products set stock=stock+v_delta where id=new.produk_id; end if;
 elsif v_old_active then update public.pmb_products set stock=stock+v_old_qty where id=old.produk_id; if v_new_active then select stock into v_stock from public.pmb_products where id=new.produk_id for update; if v_stock is null or v_stock<v_new_qty then raise exception 'Stok produk tidak mencukupi.'; end if; update public.pmb_products set stock=stock-v_new_qty where id=new.produk_id; end if;
 elsif v_new_active then select stock into v_stock from public.pmb_products where id=new.produk_id for update; if v_stock is null then raise exception 'Produk penjualan tidak ditemukan.'; end if; if v_stock<v_new_qty then raise exception 'Stok produk tidak mencukupi. Stok tersedia: %, diperlukan: %.',v_stock,v_new_qty; end if; update public.pmb_products set stock=stock-v_new_qty where id=new.produk_id; end if;
 if tg_op='DELETE' then return old; else return new; end if;
end;$function$;
drop trigger if exists trg_transaksi_update_stock on public.transaksi;
create trigger trg_transaksi_update_stock after insert or update or delete on public.transaksi for each row execute function public.kasir_update_stock_after_transaksi();
do $$ begin if not exists(select 1 from pg_constraint where conname='pmb_products_stock_nonnegative') then alter table public.pmb_products add constraint pmb_products_stock_nonnegative check(stock>=0); end if; end $$;

-- Admin master RPCs.
create or replace function public.kasir_admin_upsert_product(p_id uuid,p_name text,p_category text,p_selling_price numeric,p_stock numeric,p_is_active boolean default true) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_id uuid; begin if not public.kasir_is_admin() then raise exception 'Akses admin diperlukan.'; end if; if nullif(trim(p_name),'') is null or nullif(trim(p_category),'') is null then raise exception 'Nama dan kategori produk wajib diisi.'; end if; if p_selling_price is null or p_selling_price<0 or p_stock is null or p_stock<0 then raise exception 'Harga/stok tidak valid.'; end if; if p_id is null then insert into public.pmb_products(name,category,selling_price,stock,is_active) values(trim(p_name),trim(p_category),round(p_selling_price,2),p_stock,coalesce(p_is_active,true)) returning id into v_id; else update public.pmb_products set name=trim(p_name),category=trim(p_category),selling_price=round(p_selling_price,2),stock=p_stock,is_active=coalesce(p_is_active,true) where id=p_id returning id into v_id; if v_id is null then raise exception 'Produk tidak ditemukan.'; end if; end if; return v_id; end;$function$;
grant execute on function public.kasir_admin_upsert_product(uuid,text,text,numeric,numeric,boolean) to authenticated;
revoke execute on function public.kasir_admin_upsert_product(uuid,text,text,numeric,numeric,boolean) from anon;
create or replace function public.kasir_admin_upsert_kategori(p_id bigint,p_nama text,p_jenis text,p_aktif boolean default true,p_urutan integer default 0) returns bigint language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_id bigint; v_jenis text:=upper(trim(p_jenis)); begin if not public.kasir_is_admin() then raise exception 'Akses admin diperlukan.'; end if; if nullif(trim(p_nama),'') is null or v_jenis not in ('PEMASUKAN','PENGELUARAN') then raise exception 'Data kategori tidak valid.'; end if; if p_id is null then insert into public.kategori_kasir(nama,jenis,aktif,urutan) values(trim(p_nama),v_jenis,coalesce(p_aktif,true),coalesce(p_urutan,0)) returning id into v_id; else update public.kategori_kasir set nama=trim(p_nama),jenis=v_jenis,aktif=coalesce(p_aktif,true),urutan=coalesce(p_urutan,0),updated_at=now() where id=p_id returning id into v_id; if v_id is null then raise exception 'Kategori tidak ditemukan.'; end if; end if; return v_id; end;$function$;
grant execute on function public.kasir_admin_upsert_kategori(bigint,text,text,boolean,integer) to authenticated;
revoke execute on function public.kasir_admin_upsert_kategori(bigint,text,text,boolean,integer) from anon;