-- Security hardening: the application requires Supabase Auth before any Kasir RPC is used.
-- Keep public master-data/RPC endpoints from being callable by anonymous clients.
revoke execute on function public.audit_transaksi() from anon;
revoke execute on function public.kasir_current_role() from anon;
revoke execute on function public.kasir_is_owner() from anon;
revoke execute on function public.kasir_is_owner_or_admin() from anon;
revoke execute on function public.kasir_is_admin() from anon;
revoke execute on function public.kasir_get_kategori(text) from anon;
revoke execute on function public.kasir_get_metode_pembayaran() from anon;
revoke execute on function public.kasir_get_penanggung_jawab() from anon;
revoke execute on function public.kasir_input_transaksi(text,bigint,bigint,bigint,numeric,text) from anon;
revoke execute on function public.kasir_buka_kas(date,numeric,text) from anon;
revoke execute on function public.kasir_buka_kas_sesi(date,numeric,text) from anon;
revoke execute on function public.kasir_tutup_kas(date,numeric,text) from anon;
revoke execute on function public.kasir_tutup_kas_sesi(date,numeric,text) from anon;
revoke execute on function public.kasir_status_kas() from anon;
revoke execute on function public.kasir_dashboard_hari_ini() from anon;
revoke execute on function public.kasir_dashboard_ringkas() from anon;
revoke execute on function public.kasir_dashboard_ringkasan() from anon;
revoke execute on function public.kasir_riwayat_hari_ini() from anon;
revoke execute on function public.kasir_laporan_periode(date,date) from anon;
revoke execute on function public.kasir_batalkan_transaksi(uuid,uuid,text) from anon;
revoke execute on function public.kasir_lunasi_hutang(uuid,numeric,bigint,text) from anon;
revoke execute on function public.kasir_tambah_audit(text,text,text,jsonb,jsonb,text) from anon;
revoke execute on function public.kasir_update_sesi_setelah_transaksi() from anon;
