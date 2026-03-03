-- Migration: Add UserGrant model for admin-issued free trials

CREATE TYPE "GrantType" AS ENUM ('UNLIMITED_7DAY', 'FREE_SOURCE', 'FREE_SOURCE_OR_DEPLOY');

CREATE TABLE "UserGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantType" "GrantType" NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "grantedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserGrant_userId_usedAt_idx" ON "UserGrant"("userId", "usedAt");
CREATE INDEX "UserGrant_grantedBy_idx" ON "UserGrant"("grantedBy");

ALTER TABLE "UserGrant" ADD CONSTRAINT "UserGrant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserGrant" ADD CONSTRAINT "UserGrant_grantedBy_fkey"
    FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
