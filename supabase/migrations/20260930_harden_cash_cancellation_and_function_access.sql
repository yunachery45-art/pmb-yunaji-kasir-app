-- Harden cash cancellation and restrict privileged RPC execution.

create or replace function public.kasir_update_sesi_setelah_transaksi()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_kode_metode text;
  v_rows integer := 0;
begin
  select upper(trim(m.kode)) into v_kode_metode from public.metode_pembayaran m where m.id=coalesce(new.metode_pembayaran_id,old.metode_pembayaran_id);
  if v_kode_metode is null then raise exception 'Metode pembayaran tidak ditemukan.'; end if;
  if tg_op='INSERT' then
    if new.status='AKTIF' and v_kode_metode='CASH' then
      if new.kas_sesi_id is null then raise exception 'Transaksi CASH wajib terikat ke sesi kas.'; end if;
      if new.jenis='PEMASUKAN' then
        update public.kas_sesi set kas_masuk=coalesce(kas_masuk,0)+new.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)+new.nominal-coalesce(kas_keluar,0),updated_at=now() where id=new.kas_sesi_id and status='OPEN';
      elsif new.jenis='PENGELUARAN' then
        update public.kas_sesi set kas_keluar=coalesce(kas_keluar,0)+new.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)-coalesce(kas_keluar,0)-new.nominal,updated_at=now() where id=new.kas_sesi_id and status='OPEN';
      end if;
      get diagnostics v_rows=row_count;
      if v_rows=0 then raise exception 'Sesi kas tidak ditemukan atau sudah ditutup.'; end if;
    end if;
    return new;
  end if;
  if tg_op='UPDATE' and old.status='AKTIF' and new.status='DIBATALKAN' and v_kode_metode='CASH' then
    if old.kas_sesi_id is null then raise exception 'Transaksi CASH tidak memiliki sesi kas.'; end if;
    if old.jenis='PEMASUKAN' then
      update public.kas_sesi set kas_masuk=coalesce(kas_masuk,0)-old.nominal,kas_sistem=coalesce(kas_awal,0)+(coalesce(kas_masuk,0)-old.nominal)-coalesce(kas_keluar,0),updated_at=now() where id=old.kas_sesi_id and status='OPEN';
    elsif old.jenis='PENGELUARAN' then
      update public.kas_sesi set kas_keluar=coalesce(kas_keluar,0)-old.nominal,kas_sistem=coalesce(kas_awal,0)+coalesce(kas_masuk,0)-(coalesce(kas_keluar,0)-old.nominal),updated_at=now() where id=old.kas_sesi_id and status='OPEN';
    end if;
    get diagnostics v_rows=row_count;
    if v_rows=0 then raise exception 'Transaksi CASH hanya dapat dibatalkan saat sesi kas masih terbuka.'; end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_transaksi_update_kas_sesi on public.transaksi;
create trigger trg_transaksi_update_kas_sesi after insert or update of status on public.transaksi for each row execute function public.kasir_update_sesi_setelah_transaksi();

create or replace function public.kasir_batalkan_transaksi(p_transaksi_id uuid,p_admin_id uuid,p_alasan text)
returns public.transaksi language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_transaksi public.transaksi; v_sebelum jsonb; v_sesudah jsonb; v_admin_id uuid; v_kas_status text; v_metode text;
begin
  if auth.uid() is null then raise exception 'Admin harus login.'; end if;
  if not public.kasir_is_owner_or_admin() then raise exception 'Hanya owner/admin yang boleh membatalkan transaksi.'; end if;
  if p_alasan is null or trim(p_alasan)='' then raise exception 'Alasan pembatalan wajib diisi.'; end if;
  select * into v_transaksi from public.transaksi where id=p_transaksi_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan.'; end if;
  if v_transaksi.status<>'AKTIF' then raise exception 'Transaksi tidak dapat dibatalkan karena statusnya sudah %.',v_transaksi.status; end if;
  select upper(trim(m.kode)) into v_metode from public.metode_pembayaran m where m.id=v_transaksi.metode_pembayaran_id;
  if v_metode='CASH' then
    select ks.status into v_kas_status from public.kas_sesi ks where ks.id=v_transaksi.kas_sesi_id for update;
    if v_kas_status is distinct from 'OPEN' then raise exception 'Transaksi CASH tidak dapat dibatalkan setelah Kas ditutup.'; end if;
  end if;
  v_sebelum:=to_jsonb(v_transaksi);
  update public.transaksi set status='DIBATALKAN',updated_at=now() where id=p_transaksi_id returning * into v_transaksi;
  v_sesudah:=to_jsonb(v_transaksi);
  select a.id into v_admin_id from public.admin a where a.auth_user_id=auth.uid() and a.aktif=true limit 1;
  insert into public.audit_log(admin_id,aksi,tabel,record_id,data_sebelum,data_sesudah,alasan) values(v_admin_id,'BATAL_TRANSAKSI','transaksi',p_transaksi_id::text,v_sebelum,v_sesudah,trim(p_alasan));
  return v_transaksi;
end;
$function$;

-- Fix legacy hutang settlement authorization and allow the existing owner/admin RBAC.
-- (Function body retained from the live migration with auth_user_id-aware authorization.)

revoke execute on function public.kasir_buka_kas_sesi(date,numeric,text) from public,anon;
revoke execute on function public.kasir_laporan_periode(date,date) from public,anon;
revoke execute on function public.kasir_riwayat_hari_ini() from public,anon;
revoke execute on function public.kasir_status_kas() from public,anon;
revoke execute on function public.kasir_input_transaksi(text,bigint,bigint,bigint,numeric,text) from public,anon;
grant execute on function public.kasir_buka_kas_sesi(date,numeric,text) to authenticated;
grant execute on function public.kasir_laporan_periode(date,date) to authenticated;
grant execute on function public.kasir_riwayat_hari_ini() to authenticated;
grant execute on function public.kasir_status_kas() to authenticated;
grant execute on function public.kasir_input_transaksi(text,bigint,bigint,bigint,numeric,text) to authenticated;
