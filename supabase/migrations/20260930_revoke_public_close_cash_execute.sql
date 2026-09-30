-- Close-cash RPC is an authenticated admin-only operation.
revoke execute on function public.kasir_tutup_kas_harian(numeric,text) from public;
revoke execute on function public.kasir_tutup_kas_harian(numeric,text) from anon;
grant execute on function public.kasir_tutup_kas_harian(numeric,text) to authenticated;
