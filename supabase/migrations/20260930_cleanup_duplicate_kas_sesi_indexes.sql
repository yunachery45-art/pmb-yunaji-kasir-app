-- kas_sesi.tanggal already has the canonical UNIQUE constraint/index.
-- Remove duplicate indexes left by iterative hardening migrations.
drop index if exists public.ux_kas_sesi_tanggal;
drop index if exists public.kas_sesi_tanggal_unique;
drop index if exists public.ux_kas_sesi_one_open_per_date;
drop index if exists public.uq_kas_sesi_open_per_date;
drop index if exists public.idx_kas_sesi_tanggal;
