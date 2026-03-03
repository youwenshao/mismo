-- Migration: Add unified payment gateway support
-- Adds Payment table and updates existing models for multi-gateway support

-- Create enums for payment types
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'PAYMENTASIA');
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'FPS', 'ALIPAYHK', 'WECHATPAY', 'PAYME', 'OCTOPUS');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Create Payment table (unified across gateways)
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HKD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "commissionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: transactionId + gateway (different gateways may have same ID format)
CREATE UNIQUE INDEX "Payment_transactionId_gateway_key" ON "Payment"("transactionId", "gateway");

-- Indexes for common queries
CREATE INDEX "Payment_commissionId_idx" ON "Payment"("commissionId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_gateway_idx" ON "Payment"("gateway");
CREATE INDEX "Payment_method_idx" ON "Payment"("method");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Add foreign key to Commission
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commissionId_fkey" 
    FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add paymentId reference to HostingTransfer (for audit trail)
ALTER TABLE "HostingTransfer" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "HostingTransfer" ADD CONSTRAINT "HostingTransfer_paymentId_fkey" 
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "HostingTransfer_paymentId_idx" ON "HostingTransfer"("paymentId");

-- Migrate existing Stripe payments from HostingTransfer
INSERT INTO "Payment" (
    "id",
    "transactionId", 
    "gateway", 
    "method", 
    "amount", 
    "currency", 
    "status", 
    "commissionId",
    "completedAt",
    "createdAt", 
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text,
    ht."stripePaymentIntentId",
    'STRIPE'::"PaymentGateway",
    'CARD'::"PaymentMethod",
    -- Default to 0 if we can't determine the amount
    COALESCE((ht."deploymentConfig"->>'amount')::int, 0),
    'HKD',
    CASE 
        WHEN ht.status = 'PENDING_PAYMENT' THEN 'PENDING'::"PaymentStatus"
        WHEN ht.status IN ('PAYMENT_CONFIRMED', 'DEPLOYING', 'DEPLOYED', 'TRANSFERRING', 'COMPLETED', 'MONITORING') THEN 'COMPLETED'::"PaymentStatus"
        WHEN ht.status = 'FAILED' THEN 'FAILED'::"PaymentStatus"
        ELSE 'PENDING'::"PaymentStatus"
    END,
    ht."commissionId",
    ht."paymentConfirmedAt",
    ht."createdAt",
    NOW()
FROM "HostingTransfer" ht
WHERE ht."stripePaymentIntentId" IS NOT NULL;

-- Update HostingTransfer to reference new Payment records
UPDATE "HostingTransfer" ht
SET "paymentId" = p.id
FROM "Payment" p
WHERE ht."stripePaymentIntentId" = p."transactionId"
  AND p.gateway = 'STRIPE';

-- Add comments
COMMENT ON TABLE "Payment" IS 'Unified payment records across all gateways (Stripe, PaymentAsia)';
COMMENT ON COLUMN "HostingTransfer"."stripePaymentIntentId" IS 'DEPRECATED: Use paymentId to reference Payment table instead';
