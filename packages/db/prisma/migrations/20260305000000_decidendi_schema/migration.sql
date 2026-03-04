-- Migration: Decidendi escrow schema additions
-- Adds PaymentPhase enum, phase column on Payment, acceptance + escrow fields on Commission

-- PaymentPhase enum
CREATE TYPE "PaymentPhase" AS ENUM ('DEPOSIT', 'FINAL', 'HOSTING', 'REFUND');

-- Add phase column to Payment (default DEPOSIT for existing rows)
ALTER TABLE "Payment" ADD COLUMN "phase" "PaymentPhase" NOT NULL DEFAULT 'DEPOSIT';

-- Add client acceptance fields to Commission
ALTER TABLE "Commission" ADD COLUMN "clientAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Commission" ADD COLUMN "clientRejectedAt" TIMESTAMP(3);
ALTER TABLE "Commission" ADD COLUMN "rejectionReason" TEXT;

-- Add on-chain escrow reference fields to Commission
ALTER TABLE "Commission" ADD COLUMN "escrowTxHash" TEXT;
ALTER TABLE "Commission" ADD COLUMN "escrowChainId" INTEGER;
