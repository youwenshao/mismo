-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SLACK');
CREATE TYPE "NotificationEvent" AS ENUM ('BUILD_STARTED', 'BUILD_PROGRESS', 'BUILD_COMPLETE', 'TRANSFER_READY', 'SUPPORT_REQUIRED', 'FEEDBACK_REQUEST', 'MAINTENANCE_REPORT');

-- CreateTable: ClientPreference
CREATE TABLE "ClientPreference" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "slackWebhookUrl" TEXT,
    "maintenanceOptIn" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ClientPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientPreference_commissionId_key" ON "ClientPreference"("commissionId");
ALTER TABLE "ClientPreference" ADD CONSTRAINT "ClientPreference_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: DeliveryPackage
CREATE TABLE "DeliveryPackage" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "hostingUrl" TEXT,
    "adrDocument" TEXT NOT NULL,
    "howToGuide" TEXT NOT NULL,
    "apiDocs" TEXT,
    "videoUrl" TEXT,
    "assembledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryPackage_buildId_key" ON "DeliveryPackage"("buildId");
ALTER TABLE "DeliveryPackage" ADD CONSTRAINT "DeliveryPackage_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Feedback
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: MaintenancePlan
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "lastCheckAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "dependencyState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaintenancePlan_commissionId_key" ON "MaintenancePlan"("commissionId");
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger: Notify comms webhook on Build status changes (pg_net required, Supabase only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    RETURN;
  END IF;

  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION notify_build_stage_change()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM net.http_post(
          url := current_setting('app.comms_webhook_url', true),
          body := jsonb_build_object(
            'type', 'build_stage_change',
            'build_id', NEW.id,
            'commission_id', NEW."commissionId",
            'old_status', OLD.status,
            'new_status', NEW.status,
            'github_url', NEW."githubUrl",
            'vercel_url', NEW."vercelUrl",
            'failure_count', NEW."failureCount"
          ),
          headers := '{"Content-Type": "application/json"}'::jsonb
        );
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
  $fn$;

  DROP TRIGGER IF EXISTS on_build_stage_change ON "Build";
  CREATE TRIGGER on_build_stage_change
    AFTER UPDATE ON "Build"
    FOR EACH ROW
    EXECUTE FUNCTION notify_build_stage_change();
END $$;
