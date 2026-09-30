-- Harden cash cancellation, hutang settlement authorization, and privileged RPC execution.

create or replace function public.kasir_update_sesi_setelah_transaksi()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_kode_metode text; v_rows integer:=0;
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

create or replace function public.kasir_lunasi_hutang(p_transaksi_id uuid,p_nominal numeric,p_metode_pembayaran_id bigint,p_catatan text default null)
returns table(pelunasan_id uuid,transaksi_id uuid,nomor_transaksi text,nominal_pelunasan numeric,total_terbayar numeric,sisa_hutang numeric,status_hutang text,metode_pembayaran text,tanggal_pelunasan timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_jenis text; v_nominal_hutang numeric; v_metode_hutang text; v_metode_pelunasan text; v_total_terbayar numeric; v_sisa_hutang numeric; v_id uuid; v_tanggal timestamptz; v_status text;
begin
  if auth.uid() is null then raise exception 'Akses ditolak: admin harus login.'; end if;
  if not public.kasir_is_owner_or_admin() then raise exception 'Akses ditolak: owner/admin aktif diperlukan.'; end if;
  if p_nominal is null or p_nominal<=0 then raise exception 'Nominal pelunasan harus lebih besar dari 0.'; end if;
  select t.jenis,t.nominal,m.kode into v_jenis,v_nominal_hutang,v_metode_hutang from public.transaksi t join public.metode_pembayaran m on m.id=t.metode_pembayaran_id where t.id=p_transaksi_id and t.status='AKTIF' for update;
  if v_jenis is null then raise exception 'Transaksi tidak ditemukan atau tidak aktif.'; end if;
  if v_jenis<>'PEMASUKAN' then raise exception 'Pelunasan hutang hanya untuk pemasukan.'; end if;
  if v_metode_hutang<>'HUTANG' then raise exception 'Transaksi tersebut bukan transaksi HUTANG.'; end if;
  select m.nama into v_metode_pelunasan from public.metode_pembayaran m where m.id=p_metode_pembayaran_id and m.aktif=true and m.kode<>'HUTANG';
  if v_metode_pelunasan is null then raise exception 'Metode pembayaran pelunasan tidak valid atau tidak aktif.'; end if;
  select coalesce(sum(ph.nominal),0) into v_total_terbayar from public.pelunasan_hutang ph where ph.transaksi_id=p_transaksi_id;
  v_sisa_hutang:=v_nominal_hutang-v_total_terbayar;
  if v_sisa_hutang<=0 then raise exception 'Hutang ini sudah lunas dan tidak dapat dilunasi lagi.'; end if;
  if p_nominal>v_sisa_hutang then raise exception 'Nominal pelunasan melebihi sisa hutang. Sisa hutang: %',v_sisa_hutang; end if;
  insert into public.pelunasan_hutang(transaksi_id,tanggal_pelunasan,nominal,metode_pembayaran_id,catatan,created_by) values(p_transaksi_id,now(),round(p_nominal,2),p_metode_pembayaran_id,nullif(trim(p_catatan),''),auth.uid()) returning id,tanggal_pelunasan into v_id,v_tanggal;
  v_total_terbayar:=v_total_terbayar+p_nominal; v_sisa_hutang:=greatest(v_nominal_hutang-v_total_terbayar,0); v_status:=case when v_sisa_hutang=0 then 'LUNAS' else 'BELUM LUNAS' end;
  return query select v_id,p_transaksi_id,t.nomor_transaksi,round(p_nominal,2),round(v_total_terbayar,2),round(v_sisa_hutang,2),v_status,v_metode_pelunasan,v_tanggal from public.transaksi t where t.id=p_transaksi_id;
end;
$function$;

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
