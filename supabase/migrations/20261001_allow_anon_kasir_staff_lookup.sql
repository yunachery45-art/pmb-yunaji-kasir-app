-- The Kasir entry screen is intentionally pre-authentication: staff choose a cashier before anonymous sign-in.
-- Only the read-only active cashier lookup is exposed to anon. All transactional/admin RPCs remain authenticated-only.
grant execute on function public.kasir_get_penanggung_jawab() to anon;
