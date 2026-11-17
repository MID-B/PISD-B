-- MANUAL: stop the permanent DELETE access added by our script.
-- Does not delete data or change list/edit access, other policies, FKs, or triggers.
-- Keeps the safer Auth-ID-only trigger function. Does not restore already deleted accounts.
BEGIN;
DROP POLICY IF EXISTS smki_account_delete_it_20261117 ON public.b2_register;
COMMIT;
