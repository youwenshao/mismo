-- AlterTable: Add operational fields to StudioMetrics
ALTER TABLE "StudioMetrics" ADD COLUMN "containerCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioMetrics" ADD COLUMN "workerRunning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioMetrics" ADD COLUMN "workerRestartCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: ApiHealthSnapshot for tracking API provider health over time
CREATE TABLE "ApiHealthSnapshot" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiHealthSnapshot_provider_createdAt_idx" ON "ApiHealthSnapshot"("provider", "createdAt");
