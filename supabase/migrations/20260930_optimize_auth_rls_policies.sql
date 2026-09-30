-- Avoid per-row auth.uid() evaluation in hot RLS policies.
drop policy if exists audit_admin_select on public.audit_log;
create policy audit_admin_select on public.audit_log for select to authenticated using (exists (select 1 from public.admin a where a.id = (select auth.uid()) and a.aktif = true));

drop policy if exists admin_profiles_self on public.admin_profiles;
create policy admin_profiles_self on public.admin_profiles for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists pmb_profiles_self_admin on public.profiles;
create policy pmb_profiles_self_admin on public.profiles for select to authenticated using ((id = (select auth.uid())) or public.pmb_is_admin());

drop policy if exists transaksi_staff_insert on public.transaksi;
create policy transaksi_staff_insert on public.transaksi for insert to authenticated with check (((select auth.uid()) is not null) and (jenis = any (array['PEMASUKAN'::text,'PENGELUARAN'::text])) and (nominal > 0) and (status = 'AKTIF'::text));
