-- Security hardening: cashier/admin RPCs must not be callable by unauthenticated anon clients.
-- Anonymous cashier users are Supabase authenticated users after sign-in; the initial
-- staff picker intentionally remains public so a cashier can choose a name before auth.

revoke execute on function public.kasir_admin_dashboard_final(date,date) from public, anon;
revoke execute on function public.kasir_admin_dashboard_ui(date,date) from public, anon;
revoke execute on function public.kasir_admin_get_staff() from public, anon;
revoke execute on function public.kasir_admin_kas_hari_ini() from public, anon;
revoke execute on function public.kasir_admin_logbook_final(date,date,text) from public, anon;
revoke execute on function public.kasir_admin_rekap_pelaksana(date,date,bigint) from public, anon;
revoke execute on function public.kasir_admin_rekap_pelaksana_detail(date,date,bigint) from public, anon;
revoke execute on function public.kasir_admin_transaksi_final(date,date,text) from public, anon;
revoke execute on function public.kasir_admin_update_pengaturan(text,text) from public, anon;
revoke execute on function public.kasir_admin_upsert_kategori(bigint,text,text,boolean,integer) from public, anon;
revoke execute on function public.kasir_admin_upsert_product(uuid,text,text,numeric,numeric,boolean) from public, anon;
revoke execute on function public.kasir_admin_upsert_staff(bigint,text,text,boolean,integer) from public, anon;

revoke execute on function public.kasir_ambil_alih_pj(bigint) from public, anon;
revoke execute on function public.kasir_buka_kas(date,numeric,text) from public, anon;
revoke execute on function public.kasir_buka_kas_harian(numeric,text) from public, anon;
revoke execute on function public.kasir_buka_kas_sesi(date,numeric,text) from public, anon;
revoke execute on function public.kasir_current_operator() from public, anon;
revoke execute on function public.kasir_current_role() from public, anon;
revoke execute on function public.kasir_dashboard_hari_ini() from public, anon;
revoke execute on function public.kasir_dashboard_ringkas() from public, anon;
revoke execute on function public.kasir_dashboard_ringkasan() from public, anon;
revoke execute on function public.kasir_get_kategori(text) from public, anon;
revoke execute on function public.kasir_get_metode_pembayaran() from public, anon;
revoke execute on function public.kasir_input_pelayanan(text,integer,bigint,bigint,bigint,numeric,text) from public, anon;
revoke execute on function public.kasir_input_pengeluaran(bigint,bigint,numeric,text) from public, anon;
revoke execute on function public.kasir_input_penjualan(uuid,numeric,bigint,numeric,text) from public, anon;
revoke execute on function public.kasir_input_transaksi(text,bigint,bigint,bigint,numeric,text) from public, anon;
revoke execute on function public.kasir_is_admin() from public, anon;
revoke execute on function public.kasir_is_owner() from public, anon;
revoke execute on function public.kasir_is_owner_or_admin() from public, anon;
revoke execute on function public.kasir_koreksi_transaksi_saya(uuid,text,integer,bigint,bigint,bigint,numeric,text,uuid,numeric) from public, anon;
revoke execute on function public.kasir_laporan_periode(date,date) from public, anon;
revoke execute on function public.kasir_lunasi_hutang(uuid,numeric,bigint,text) from public, anon;
revoke execute on function public.kasir_pj_aktif() from public, anon;
revoke execute on function public.kasir_rekap_saya() from public, anon;
revoke execute on function public.kasir_rekap_saya_detail() from public, anon;
revoke execute on function public.kasir_riwayat_hari_ini() from public, anon;
revoke execute on function public.kasir_riwayat_pasien_hari_ini() from public, anon;
revoke execute on function public.kasir_riwayat_transaksi_saya() from public, anon;
revoke execute on function public.kasir_set_operator(bigint) from public, anon;
revoke execute on function public.kasir_status_kas() from public, anon;
revoke execute on function public.kasir_status_kas_kasir() from public, anon;
revoke execute on function public.kasir_tambah_audit(text,text,text,jsonb,jsonb,text) from public, anon;
revoke execute on function public.kasir_tutup_kas(date,numeric,text) from public, anon;
revoke execute on function public.kasir_tutup_kas_harian(numeric,text) from public, anon;
revoke execute on function public.kasir_tutup_kas_sesi(date,numeric,text) from public, anon;
revoke execute on function public.kasir_update_sesi_setelah_transaksi() from public, anon;
revoke execute on function public.kasir_update_stock_after_transaksi() from public, anon;

grant execute on function public.kasir_admin_dashboard_final(date,date) to authenticated;
grant execute on function public.kasir_admin_dashboard_ui(date,date) to authenticated;
grant execute on function public.kasir_admin_get_staff() to authenticated;
grant execute on function public.kasir_admin_kas_hari_ini() to authenticated;
grant execute on function public.kasir_admin_logbook_final(date,date,text) to authenticated;
grant execute on function public.kasir_admin_rekap_pelaksana(date,date,bigint) to authenticated;
grant execute on function public.kasir_admin_rekap_pelaksana_detail(date,date,bigint) to authenticated;
grant execute on function public.kasir_admin_transaksi_final(date,date,text) to authenticated;
grant execute on function public.kasir_admin_update_pengaturan(text,text) to authenticated;
grant execute on function public.kasir_admin_upsert_kategori(bigint,text,text,boolean,integer) to authenticated;
grant execute on function public.kasir_admin_upsert_product(uuid,text,text,numeric,numeric,boolean) to authenticated;
grant execute on function public.kasir_admin_upsert_staff(bigint,text,text,boolean,integer) to authenticated;
grant execute on function public.kasir_ambil_alih_pj(bigint) to authenticated;
grant execute on function public.kasir_buka_kas(date,numeric,text) to authenticated;
grant execute on function public.kasir_buka_kas_harian(numeric,text) to authenticated;
grant execute on function public.kasir_buka_kas_sesi(date,numeric,text) to authenticated;
grant execute on function public.kasir_current_operator() to authenticated;
grant execute on function public.kasir_current_role() to authenticated;
grant execute on function public.kasir_dashboard_hari_ini() to authenticated;
grant execute on function public.kasir_dashboard_ringkas() to authenticated;
grant execute on function public.kasir_dashboard_ringkasan() to authenticated;
grant execute on function public.kasir_get_kategori(text) to authenticated;
grant execute on function public.kasir_get_metode_pembayaran() to authenticated;
grant execute on function public.kasir_input_pelayanan(text,integer,bigint,bigint,bigint,numeric,text) to authenticated;
grant execute on function public.kasir_input_pengeluaran(bigint,bigint,numeric,text) to authenticated;
grant execute on function public.kasir_input_penjualan(uuid,numeric,bigint,numeric,text) to authenticated;
grant execute on function public.kasir_input_transaksi(text,bigint,bigint,bigint,numeric,text) to authenticated;
grant execute on function public.kasir_is_admin() to authenticated;
grant execute on function public.kasir_is_owner() to authenticated;
grant execute on function public.kasir_is_owner_or_admin() to authenticated;
grant execute on function public.kasir_koreksi_transaksi_saya(uuid,text,integer,bigint,bigint,bigint,numeric,text,uuid,numeric) to authenticated;
grant execute on function public.kasir_laporan_periode(date,date) to authenticated;
grant execute on function public.kasir_lunasi_hutang(uuid,numeric,bigint,text) to authenticated;
grant execute on function public.kasir_pj_aktif() to authenticated;
grant execute on function public.kasir_rekap_saya() to authenticated;
grant execute on function public.kasir_rekap_saya_detail() to authenticated;
grant execute on function public.kasir_riwayat_hari_ini() to authenticated;
grant execute on function public.kasir_riwayat_pasien_hari_ini() to authenticated;
grant execute on function public.kasir_riwayat_transaksi_saya() to authenticated;
grant execute on function public.kasir_set_operator(bigint) to authenticated;
grant execute on function public.kasir_status_kas() to authenticated;
grant execute on function public.kasir_status_kas_kasir() to authenticated;
grant execute on function public.kasir_tambah_audit(text,text,text,jsonb,jsonb,text) to authenticated;
grant execute on function public.kasir_tutup_kas(date,numeric,text) to authenticated;
grant execute on function public.kasir_tutup_kas_harian(numeric,text) to authenticated;
grant execute on function public.kasir_tutup_kas_sesi(date,numeric,text) to authenticated;
grant execute on function public.kasir_update_sesi_setelah_transaksi() to authenticated;

-- Trigger function should not be directly executable by API roles.
revoke execute on function public.kasir_update_stock_after_transaksi() from authenticated;

-- Defense in depth for patient history: even authenticated callers must have a cashier session.
create or replace function public.kasir_riwayat_pasien_hari_ini()
returns table(jam text, nama_pasien text, umur integer, pelayanan text, pelaksana text)
language sql
security definer
set search_path to 'public','pg_temp'
as $function$
  select to_char(l.tanggal_waktu at time zone 'Asia/Jakarta','HH24:MI'),l.nama_pasien,l.umur,l.pelayanan,s.nama
  from public.logbook_pasien l
  join public.staff s on s.id=l.pelaksana_id
  where auth.uid() is not null
    and exists (select 1 from public.kasir_operator_sessions os where os.user_id=auth.uid() and os.aktif=true)
    and (l.tanggal_waktu at time zone 'Asia/Jakarta')::date=(now() at time zone 'Asia/Jakarta')::date
  order by l.tanggal_waktu desc;
$function$;
revoke execute on function public.kasir_riwayat_pasien_hari_ini() from public, anon;
grant execute on function public.kasir_riwayat_pasien_hari_ini() to authenticated;
