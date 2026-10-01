create or replace function public.kasir_admin_dashboard_detail(p_mulai date, p_selesai date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.kasir_is_admin() then
    raise exception 'Akses admin diperlukan.';
  end if;

  select jsonb_build_object(
    'pelaksana', coalesce((
      select jsonb_agg(x order by x.jumlah_pelayanan desc, x.pelaksana)
      from (
        select s.nama as pelaksana,
               count(t.id)::bigint as jumlah_pelayanan,
               coalesce(sum(t.nominal),0)::numeric as total_nominal
        from public.transaksi t
        join public.staff s on s.id=t.penanggung_jawab_id
        where t.status='AKTIF'
          and t.subjenis='PELAYANAN'
          and (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date between p_mulai and p_selesai
        group by s.nama
      ) x
    ), '[]'::jsonb),
    'pelayanan', coalesce((
      select jsonb_agg(x order by x.jumlah desc, x.pelayanan)
      from (
        select k.nama as pelayanan,
               count(t.id)::bigint as jumlah,
               coalesce(sum(t.nominal),0)::numeric as nominal
        from public.transaksi t
        join public.kategori_kasir k on k.id=t.kategori_id
        where t.status='AKTIF'
          and t.subjenis='PELAYANAN'
          and t.jenis='PEMASUKAN'
          and (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date between p_mulai and p_selesai
        group by k.nama
      ) x
    ), '[]'::jsonb),
    'pembayaran', coalesce((
      select jsonb_agg(x order by x.jumlah_transaksi desc, x.metode)
      from (
        select m.nama as metode,
               count(t.id)::bigint as jumlah_transaksi,
               coalesce(sum(t.nominal),0)::numeric as total_nominal
        from public.transaksi t
        join public.metode_pembayaran m on m.id=t.metode_pembayaran_id
        where t.status='AKTIF'
          and (t.tanggal_transaksi at time zone 'Asia/Jakarta')::date between p_mulai and p_selesai
        group by m.nama
      ) x
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.kasir_admin_dashboard_detail(date,date) from public;
grant execute on function public.kasir_admin_dashboard_detail(date,date) to authenticated;
