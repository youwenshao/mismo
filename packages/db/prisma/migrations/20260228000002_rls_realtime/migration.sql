-- RLS and Realtime: only run when Supabase auth schema exists (skip in shadow DB).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RETURN;
  END IF;

  ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Build" ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own commissions" ON "Commission";
  EXECUTE 'CREATE POLICY "Users can view their own commissions"
    ON "Commission" FOR SELECT
    USING (auth.uid()::text = "userId")';

  DROP POLICY IF EXISTS "Users can view builds for their commissions" ON "Build";
  EXECUTE 'CREATE POLICY "Users can view builds for their commissions"
    ON "Build" FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "Commission" c
        WHERE c.id = "Build"."commissionId" AND c."userId" = auth.uid()::text
      )
    )';

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE "Build";
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
