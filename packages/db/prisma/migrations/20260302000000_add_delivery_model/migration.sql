-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('VALIDATING', 'CREATING_REPO', 'GENERATING_DOCS', 'TRANSFERRING', 'AWAITING_ACCEPTANCE', 'VERIFYING', 'COMPLETED', 'FAILED', 'ROLLBACK');

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "githubOrg" TEXT NOT NULL,
    "clientGithubUsername" TEXT,
    "clientGithubOrg" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'VALIDATING',
    "repoUrl" TEXT,
    "transferredRepoUrl" TEXT,
    "inviteId" INTEGER,
    "inviteRetryCount" INTEGER NOT NULL DEFAULT 0,
    "secretScanPassed" BOOLEAN NOT NULL DEFAULT false,
    "bmadChecksPassed" BOOLEAN NOT NULL DEFAULT false,
    "contractCheckPassed" BOOLEAN NOT NULL DEFAULT false,
    "deliverables" JSONB,
    "auditLog" JSONB NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
