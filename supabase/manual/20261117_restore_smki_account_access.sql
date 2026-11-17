-- MANUAL: review with B2 before running in Supabase SQL Editor.
-- Restores list/edit/deactivate access for explicitly approved IT accounts only.
-- Does not modify records, existing policies, foreign keys, Auth, or registration triggers.
-- Permanent DELETE remains unchanged until the Auth deletion trigger is reviewed.
--
-- First obtain and verify candidate identities using this SELECT separately:
-- SELECT r.full_name, r.email, r.auth_user_id
-- FROM public.b2_register r
-- JOIN auth.users u ON u.id = r.auth_user_id
-- WHERE r.is_active IS TRUE AND (
--   r.departement_id = '8113ab6f-d5cc-4c94-bbf6-e08047931fab'::uuid OR
--   r.position_id = '265c9357-105c-437c-a244-6897122f17c1'::uuid
-- );
--
-- Approved by MID: dellarosa@andima.co.id and griselda@andima.co.id only.
-- Values below are verified auth_user_id values, NOT employee IDs.
-- Example syntax only: ARRAY['verified-uuid-here']::uuid[]
-- An empty list aborts the transaction; no access is opened accidentally.

BEGIN;

DO $setup$
DECLARE
  approved_auth_ids uuid[] := ARRAY[
    '569e4474-1970-4586-921f-b4164a1d1556', -- dellarosa@andima.co.id
    '180be7a0-8cb5-4930-a8ca-db4966c1f5c8'  -- griselda@andima.co.id
  ]::uuid[];
  matching_accounts integer;
BEGIN
  IF coalesce(cardinality(approved_auth_ids), 0) = 0
     OR array_position(approved_auth_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Fill approved_auth_ids with verified IT auth_user_id values first.';
  END IF;

  IF cardinality(approved_auth_ids) <> (
    SELECT count(DISTINCT approved_id) FROM unnest(approved_auth_ids) AS ids(approved_id)
  ) THEN
    RAISE EXCEPTION 'approved_auth_ids must not contain duplicates.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.b2_register'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Expected b2_register RLS to be enabled; stop and review current settings.';
  END IF;

  SELECT count(*) INTO matching_accounts
  FROM public.b2_register r
  JOIN auth.users u ON u.id = r.auth_user_id
  WHERE r.auth_user_id = ANY(approved_auth_ids)
    AND r.is_active IS TRUE
    AND (
      r.departement_id = '8113ab6f-d5cc-4c94-bbf6-e08047931fab'::uuid OR
      r.position_id = '265c9357-105c-437c-a244-6897122f17c1'::uuid
    );

  IF matching_accounts <> cardinality(approved_auth_ids) THEN
    RAISE EXCEPTION 'Every approved identity must match an existing active IT profile and Auth user.';
  END IF;

  -- Fixed approved identities prevent self-registration as IT from granting SMKI access.
  -- SECURITY DEFINER prevents a recursive RLS lookup of b2_register.
  -- CREATE (not REPLACE) deliberately fails if this helper already exists.
  EXECUTE format($ddl$
    CREATE FUNCTION public.smki_account_admin_20261117()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $body$
      SELECT auth.uid() = ANY(%L::uuid[])
        AND EXISTS (
          SELECT 1 FROM public.b2_register r
          WHERE r.auth_user_id = auth.uid()
            AND r.is_active IS TRUE
            AND (
              r.departement_id = '8113ab6f-d5cc-4c94-bbf6-e08047931fab'::uuid OR
              r.position_id = '265c9357-105c-437c-a244-6897122f17c1'::uuid
            )
        )
    $body$
  $ddl$, approved_auth_ids::text);
END;
$setup$;

ALTER FUNCTION public.smki_account_admin_20261117() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.smki_account_admin_20261117() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.smki_account_admin_20261117() TO authenticated;

CREATE POLICY smki_account_select_it_20261117
ON public.b2_register
FOR SELECT TO authenticated
USING ((SELECT public.smki_account_admin_20261117()));

CREATE POLICY smki_account_update_it_20261117
ON public.b2_register
FOR UPDATE TO authenticated
USING ((SELECT public.smki_account_admin_20261117()))
WITH CHECK ((SELECT public.smki_account_admin_20261117()));

COMMIT;

-- Targeted rollback, if needed (review and run separately):
-- BEGIN;
-- DROP POLICY smki_account_update_it_20261117 ON public.b2_register;
-- DROP POLICY smki_account_select_it_20261117 ON public.b2_register;
-- DROP FUNCTION public.smki_account_admin_20261117();
-- COMMIT;
