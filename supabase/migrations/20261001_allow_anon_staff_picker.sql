-- The cashier login screen must list active PJ/staff before an anonymous session exists.
-- This function returns only active staff IDs and names; it exposes no financial or patient data.
grant execute on function public.kasir_get_penanggung_jawab() to anon;
