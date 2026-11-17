-- MANUAL: permanent DELETE access for the two previously approved SMKI admins.
-- Run once in Supabase SQL Editor as postgres, after reviewing with B2/MID.
-- This script does not delete accounts. A later click in Account Maintains does.
-- Existing FK rules and cascades are preserved, including deletion of the target's logs.
-- Login, registration, IDs, and other squads' policies are not changed.
-- The existing Auth-delete function is narrowed to OLD.auth_user_id (no email fallback).

BEGIN;

DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run as postgres in Supabase SQL Editor.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
    WHERE c.oid = 'public.b2_register'::regclass
      AND c.relrowsecurity AND NOT c.relforcerowsecurity AND r.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Register ownership/RLS settings changed. Stop and review.';
  END IF;

  -- Fail instead of silently overwriting a function changed since the reviewed evidence.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
    WHERE p.oid = to_regprocedure('public.smki_account_admin_20261117()')
      AND r.rolname = 'postgres' AND p.prosecdef
      AND p.proconfig = ARRAY['search_path=pg_catalog']::text[]
      AND md5(regexp_replace(p.prosrc, '\s+', ' ', 'g')) = '4679312c19f2301d9ed6533977d5375d'
  ) THEN
    RAISE EXCEPTION 'Approved SMKI admin helper differs from the reviewed version. Stop and review.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.b2_register', 'DELETE') THEN
    RAISE EXCEPTION 'Expected authenticated table DELETE privilege; stop and review grants.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'b2_register'
      AND cmd IN ('DELETE', 'ALL')
      AND roles && ARRAY['public', 'authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'An applicable DELETE policy already exists. Do not stack unreviewed access rules.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
    WHERE p.oid = to_regprocedure('public.fn_cascade_delete_auth_user()')
      AND r.rolname = 'postgres' AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
      AND md5(regexp_replace(p.prosrc, '\s+', ' ', 'g')) = 'fa46ead02aca20ff6aea5b44b3bb23e1'
  ) THEN
    RAISE EXCEPTION 'Auth-delete function differs from the reviewed version. Stop and review.';
  END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_trigger
      WHERE tgfoid = to_regprocedure('public.fn_cascade_delete_auth_user()')
        AND NOT tgisinternal) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger
       WHERE tgrelid = 'public.b2_register'::regclass
         AND tgname = 'trg_cascade_delete_auth_user'
         AND tgfoid = to_regprocedure('public.fn_cascade_delete_auth_user()')
         AND tgtype = 9 AND tgenabled = 'O' AND NOT tgisinternal
     ) THEN
    RAISE EXCEPTION 'Unexpected Auth-delete trigger configuration. Stop and review.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.b2_register WHERE auth_user_id IS NULL) THEN
    RAISE EXCEPTION 'A profile is missing auth_user_id. Resolve linkage before enabling general deletion.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.fn_cascade_delete_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_OP <> 'DELETE' OR TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'b2_register' THEN
    RAISE EXCEPTION 'Unexpected use of the register Auth-delete trigger.' USING ERRCODE = '42501';
  END IF;

  IF OLD.auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Account Auth identity is missing. Deletion cancelled.' USING ERRCODE = '23503';
  END IF;

  -- A failed FK check anywhere in this deletion chain rolls back the deletion.
  -- Do not catch/suppress that error or delete other squads' data to bypass it.
  DELETE FROM auth.users WHERE id = OLD.auth_user_id;
  RETURN OLD;
END;
$function$;

CREATE POLICY smki_account_delete_it_20261117
ON public.b2_register
FOR DELETE TO authenticated
USING (
  (SELECT public.smki_account_admin_20261117())
  AND auth_user_id IS NOT NULL
  AND auth_user_id <> (SELECT auth.uid())
  AND auth_user_id <> ALL(ARRAY[
    '569e4474-1970-4586-921f-b4164a1d1556'::uuid,
    '180be7a0-8cb5-4930-a8ca-db4966c1f5c8'::uuid
  ])
);

COMMIT;

-- Inspect metadata only after success:
SELECT policyname, cmd, roles, qual
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename = 'b2_register'
  AND policyname = 'smki_account_delete_it_20261117';
