-- Security Hardening: Fix RLS policies and add RLS to all client-facing tables.
-- The previous migration compared auth.uid() (Supabase UUID) with Commission.userId (Prisma cuid).
-- This migration fixes the mismatch by joining through the User table.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RETURN;
  END IF;

  -- ========================================================================
  -- Helper function: resolve Prisma User.id from Supabase auth.uid()
  -- ========================================================================
  EXECUTE '
    CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
    AS $func$
      SELECT id FROM "User" WHERE "supabaseAuthId" = auth.uid()::text LIMIT 1;
    $func$;
  ';

  -- ========================================================================
  -- Commission: Fix SELECT, add INSERT/UPDATE/DELETE
  -- ========================================================================
  ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own commissions" ON "Commission";
  EXECUTE 'CREATE POLICY "Users can view their own commissions"
    ON "Commission" FOR SELECT
    USING ("userId" = public.current_user_id())';

  DROP POLICY IF EXISTS "Users can insert their own commissions" ON "Commission";
  EXECUTE 'CREATE POLICY "Users can insert their own commissions"
    ON "Commission" FOR INSERT
    WITH CHECK ("userId" = public.current_user_id())';

  DROP POLICY IF EXISTS "Users can update their own commissions" ON "Commission";
  EXECUTE 'CREATE POLICY "Users can update their own commissions"
    ON "Commission" FOR UPDATE
    USING ("userId" = public.current_user_id())';

  -- ========================================================================
  -- Build: Fix SELECT (join through Commission)
  -- ========================================================================
  ALTER TABLE "Build" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view builds for their commissions" ON "Build";
  EXECUTE 'CREATE POLICY "Users can view builds for their commissions"
    ON "Build" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Build"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- Credential: Enable RLS, add policies
  -- ========================================================================
  ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view credentials for their commissions" ON "Credential";
  EXECUTE 'CREATE POLICY "Users can view credentials for their commissions"
    ON "Credential" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Credential"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  DROP POLICY IF EXISTS "Users can insert credentials for their commissions" ON "Credential";
  EXECUTE 'CREATE POLICY "Users can insert credentials for their commissions"
    ON "Credential" FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Credential"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  DROP POLICY IF EXISTS "Users can update credentials for their commissions" ON "Credential";
  EXECUTE 'CREATE POLICY "Users can update credentials for their commissions"
    ON "Credential" FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Credential"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- Project: Enable RLS
  -- ========================================================================
  ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own projects" ON "Project";
  EXECUTE 'CREATE POLICY "Users can view their own projects"
    ON "Project" FOR SELECT
    USING ("userId" = public.current_user_id())';

  DROP POLICY IF EXISTS "Users can insert their own projects" ON "Project";
  EXECUTE 'CREATE POLICY "Users can insert their own projects"
    ON "Project" FOR INSERT
    WITH CHECK ("userId" = public.current_user_id())';

  DROP POLICY IF EXISTS "Users can update their own projects" ON "Project";
  EXECUTE 'CREATE POLICY "Users can update their own projects"
    ON "Project" FOR UPDATE
    USING ("userId" = public.current_user_id())';

  -- ========================================================================
  -- Delivery: Enable RLS (through Commission)
  -- ========================================================================
  ALTER TABLE "Delivery" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view deliveries for their commissions" ON "Delivery";
  EXECUTE 'CREATE POLICY "Users can view deliveries for their commissions"
    ON "Delivery" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Delivery"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- HostingTransfer: Enable RLS (through Commission)
  -- ========================================================================
  ALTER TABLE "HostingTransfer" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view hosting transfers for their commissions" ON "HostingTransfer";
  EXECUTE 'CREATE POLICY "Users can view hosting transfers for their commissions"
    ON "HostingTransfer" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "HostingTransfer"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- ClientPreference: Enable RLS (through Commission)
  -- ========================================================================
  ALTER TABLE "ClientPreference" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their client preferences" ON "ClientPreference";
  EXECUTE 'CREATE POLICY "Users can view their client preferences"
    ON "ClientPreference" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "ClientPreference"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  DROP POLICY IF EXISTS "Users can update their client preferences" ON "ClientPreference";
  EXECUTE 'CREATE POLICY "Users can update their client preferences"
    ON "ClientPreference" FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "ClientPreference"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- User: Enable RLS (users can only see themselves)
  -- ========================================================================
  ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own record" ON "User";
  EXECUTE 'CREATE POLICY "Users can view their own record"
    ON "User" FOR SELECT
    USING ("supabaseAuthId" = auth.uid()::text)';

  DROP POLICY IF EXISTS "Users can update their own record" ON "User";
  EXECUTE 'CREATE POLICY "Users can update their own record"
    ON "User" FOR UPDATE
    USING ("supabaseAuthId" = auth.uid()::text)';

  -- ========================================================================
  -- Notification: Enable RLS (through Commission)
  -- ========================================================================
  ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view notifications for their commissions" ON "Notification";
  EXECUTE 'CREATE POLICY "Users can view notifications for their commissions"
    ON "Notification" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Notification"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- Feedback: Enable RLS (through Commission)
  -- ========================================================================
  ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view feedback for their commissions" ON "Feedback";
  EXECUTE 'CREATE POLICY "Users can view feedback for their commissions"
    ON "Feedback" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Feedback"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  DROP POLICY IF EXISTS "Users can insert feedback for their commissions" ON "Feedback";
  EXECUTE 'CREATE POLICY "Users can insert feedback for their commissions"
    ON "Feedback" FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Feedback"."commissionId"
          AND c."userId" = public.current_user_id()
      )
    )';

  -- ========================================================================
  -- Internal/Admin-only tables: RLS enabled, deny all via anon/authenticated.
  -- Service-role key bypasses RLS, so internal tools still work.
  -- ========================================================================
  ALTER TABLE "SystemConfig" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "StudioMetrics" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "MonitoringAlert" ENABLE ROW LEVEL SECURITY;

  -- No policies = deny all for anon/authenticated roles.
  -- Service-role key used by internal app and farm-monitor bypasses RLS.

END $$;
