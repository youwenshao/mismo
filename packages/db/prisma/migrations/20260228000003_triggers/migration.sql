-- Trigger: When build fails 3 times, escalate to human_review (no Supabase deps).
CREATE OR REPLACE FUNCTION check_build_failures()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'FAILED' THEN
    NEW."failureCount" := COALESCE(OLD."failureCount", 0) + 1;
    IF NEW."failureCount" >= 3 THEN
      NEW."humanReview" := true;
      UPDATE "Commission" SET status = 'ESCALATED' WHERE id = NEW."commissionId";
    END IF;
  END IF;
  IF NEW.status = 'SUCCESS' THEN
    NEW."failureCount" := 0;
    NEW."humanReview" := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_build_escalation ON "Build";
CREATE TRIGGER check_build_escalation
  BEFORE UPDATE ON "Build"
  FOR EACH ROW
  EXECUTE FUNCTION check_build_failures();

-- Webhook trigger: only when pg_net available (Supabase; skip in shadow DB).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    RETURN;
  END IF;

  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION notify_n8n_commission_completed()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        PERFORM net.http_post(
          url := 'https://n8n.yourdomain.com/webhook/commission-completed',
          body := jsonb_build_object(
            'commission_id', NEW.id,
            'client_email', NEW."clientEmail",
            'status', NEW.status
          ),
          headers := '{"Content-Type": "application/json"}'::jsonb
        );
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
  $fn$;

  DROP TRIGGER IF EXISTS on_commission_completed ON "Commission";
  CREATE TRIGGER on_commission_completed
    AFTER UPDATE ON "Commission"
    FOR EACH ROW
    EXECUTE FUNCTION notify_n8n_commission_completed();
END $$;
