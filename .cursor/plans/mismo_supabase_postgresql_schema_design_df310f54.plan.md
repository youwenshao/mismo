---
name: Mismo Supabase PostgreSQL Schema Design
overview: Design Prisma schema and raw SQL migrations for Mismo platform targeting Supabase, including RLS policies, pgsodium encryption, realtime capabilities, and integration with project archetypes taxonomy.
todos:
  - id: update_prisma_schema
    content: Update `schema.prisma` with Commission, Build, Agent, DesignDNA, Credential, and ProjectArchetype models.
    status: completed
  - id: migration_pgsodium
    content: Create raw SQL migration for `pgsodium` column encryption.
    status: completed
  - id: migration_rls_realtime
    content: Create raw SQL migration for Row-Level Security (RLS) policies and Realtime publication.
    status: completed
  - id: migration_triggers
    content: Create raw SQL migration for Supabase triggers (webhook via pg_net and failure escalation).
    status: completed
  - id: apply_migrations
    content: Run Prisma migrations to apply schema and SQL changes locally.
    status: completed
isProject: false
---

# Mismo Supabase PostgreSQL Schema Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Design the database schema for the Mismo agency platform with Supabase integration, including `commissions`, `builds`, `agents`, `design_dna`, and encrypted `credentials`, with RLS and triggers.

**Architecture:** We will extend the existing Prisma schema in `packages/db/prisma/schema.prisma` with the new tables requested. We will use Prisma for schema definition and basic migrations. We will complement this with custom raw SQL migrations (`db:execute`) to implement Supabase-specific features: RLS policies, pgsodium column encryption, and triggers (webhooks for n8n, escalation flags).

**Tech Stack:** Prisma, PostgreSQL (Supabase), pgsodium (encryption), Supabase Realtime.

---

### Task 1: Update Prisma Schema - Add Core Tables

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add ENUMs and base models**

Update the `schema.prisma` to include the requested tables: `Commission` (renaming from/integrating with existing `Project` or adding alongside it - based on user intent, we will create `Commission` as it maps cleanly to the request), `Build`, `Agent`, `DesignDNA`, and `Credential`. Also, add a `ProjectArchetype` taxonomy table.

We will add the following definitions:

```prisma
enum CommissionStatus {
  DRAFT
  DISCOVERY
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ESCALATED
}

enum PaymentState {
  UNPAID
  PARTIAL
  FINAL
}

enum AgentType {
  DATABASE
  BACKEND
  FRONTEND
  DEVOPS
  QA
  COORDINATOR
}

model ProjectArchetype {
  id          String       @id @default(cuid())
  slug        String       @unique // e.g., 'landing_page', 'saas_mvp'
  name        String
  description String?
  metadata    Json?        @default("{}") // Agent-extensible metadata
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  DesignDNA   DesignDNA[]
  Commission  Commission[]
}

model Commission {
  id               String           @id @default(cuid())
  clientEmail      String
  status           CommissionStatus @default(DRAFT)
  prdJson          Json?
  archetypeId      String?
  paymentState     PaymentState     @default(UNPAID)
  stripeCustomerId String?
  userId           String // Link to auth user for RLS

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user        User              @relation(fields: [userId], references: [id])
  archetype   ProjectArchetype? @relation(fields: [archetypeId], references: [id])
  builds      Build[]
  credentials Credential[]
}

model Build {
  id               String   @id @default(cuid())
  commissionId     String
  executionIds     Json     @default("[]") // JSON array for swarm
  studioAssignment String? // which Mac handled it
  kimiqTokensUsed  Int      @default(0)
  githubUrl        String?
  vercelUrl        String?
  status           String   @default("PENDING") // PENDING, RUNNING, FAILED, SUCCESS
  errorLogs        Json?
  failureCount     Int      @default(0) // Track failures for trigger
  humanReview      Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  commission Commission @relation(fields: [commissionId], references: [id])
}

model Agent {
  id             String    @id @default(cuid())
  type           AgentType
  currentLoad    Int       @default(0)
  studioLocation String // studio-1/2/3
  lastHeartbeat  DateTime  @default(now())
  status         String    @default("ACTIVE")
}

model DesignDNA {
  id                  String  @id @default(cuid())
  archetypeId         String
  tokens              Json    @default("{}") // JSON for tokens
  forbiddenPatterns   String[] // Array of forbidden pattern strings
  componentReferences String[] // URLs to approved components

  archetype ProjectArchetype @relation(fields: [archetypeId], references: [id])
}

model Credential {
  id              String    @id @default(cuid())
  commissionId    String
  service         String // github/vercel/stripe
  encryptedTokens String // Will be encrypted via pgsodium
  nonce           String? // For pgsodium if needed by implementation
  keyId           String? // References pgsodium key
  rotationDate    DateTime?

  commission Commission @relation(fields: [commissionId], references: [id])

  @@unique([commissionId, service])
}
```

Make sure to add `commissions Commission[]` to the existing `User` model to establish the relation.

### Task 2: Create Raw SQL Migration for pgsodium Encryption

**Files:**

- Create: `packages/db/prisma/migrations/XXXXXXXXXXXXXX_setup_pgsodium/migration.sql`

**Step 1: Write migration for pgsodium setup and table encryption**

Create a raw SQL migration to initialize pgsodium and encrypt the `encryptedTokens` column in the `Credential` table. Note: Supabase has pgsodium installed, but we need to set up the key and view.

_Implementation Note: We will use the Transparent Column Encryption (TCE) feature of pgsodium._

```sql
-- Enable pgsodium extension if not already enabled (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;

-- Create a Key ID for credentials if using a specific key
-- In Supabase, the root key is usually managed for you, but we can derive one.
-- Let's use the built-in TCE syntax.

-- We assume the Prisma migration has already created the "Credential" table.
-- We will alter it to use pgsodium for encryption.

-- Since Prisma manages the schema, mixing TCE with Prisma can be tricky because
-- Prisma drops and recreates views/triggers sometimes, or doesn't know about them.
-- A common approach in Supabase + Prisma is to use pgsodium crypto functions in
-- INSERT/UPDATE triggers or views, or handle encryption at the application layer.
-- Here, we will provide the SQL to create a secure view and triggers to handle
-- transparent encryption/decryption, hiding the raw table from normal access
-- if needed, OR we just use trigger-based encryption.

-- Add a key ID column if Prisma didn't (we added it in Prisma schema).
-- We will populate it with a default key for the table.
DO $$
DECLARE
    new_key_id uuid;
BEGIN
    -- Create a new key for credentials
    new_key_id := pgsodium.create_key(
        name := 'credential_encryption_key'
    );

    -- Set default key for new records if we want a single table key
    -- Or we can just use the server root key dynamically.
END $$;

-- Better approach for Supabase + Prisma:
-- Create functions that use pgsodium to encrypt/decrypt using the root key
-- and call them from the application or via database triggers.

-- Example Trigger for auto-encryption before insert/update
CREATE OR REPLACE FUNCTION encrypt_credential_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."encryptedTokens" IS NOT NULL THEN
        -- Assuming NEW.encryptedTokens comes in as plaintext during INSERT/UPDATE
        -- and we encrypt it. (In a real app, you might encrypt in the backend).
        -- Here we demonstrate DB-level encryption using pgsodium.
        -- We use a derived key based on commissionId for uniqueness
        NEW."nonce" := encode(pgsodium.crypto_aead_det_noncegen(), 'base64');
        NEW."encryptedTokens" := encode(
            pgsodium.crypto_aead_det_encrypt(
                convert_to(NEW."encryptedTokens", 'utf8'),
                convert_to(NEW."commissionId", 'utf8'),
                pgsodium.create_key('credential_key') -- ensure key exists
            ),
            'base64'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER encrypt_credential_trigger
BEFORE INSERT OR UPDATE OF "encryptedTokens" ON "Credential"
FOR EACH ROW
EXECUTE FUNCTION encrypt_credential_token();
```

_(Note: The exact pgsodium setup might require specific Supabase tenant IDs or key management strategies. The above is a conceptual standard SQL implementation. We will refine the exact SQL based on standard Supabase pgsodium TCE docs during execution)._

### Task 3: Create Raw SQL Migration for RLS and Realtime

**Files:**

- Create: `packages/db/prisma/migrations/XXXXXXXXXXXXXX_rls_realtime/migration.sql`

**Step 1: Write migration for RLS and Realtime**

Enable RLS on `Commission` and `Build`, and set up Realtime for `Build`.

```sql
-- Enable RLS
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Build" ENABLE ROW LEVEL SECURITY;

-- Policy: Users see only their commissions
CREATE POLICY "Users can view their own commissions"
ON "Commission"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Policy: Users can see builds for their commissions
CREATE POLICY "Users can view builds for their commissions"
ON "Build"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Commission" c
    WHERE c.id = "Build"."commissionId"
    AND c."userId" = auth.uid()::text
  )
);

-- Note: We likely need policies for INSERT/UPDATE as well depending on access needs.
-- Assuming internal agents/services bypass RLS (using service role key).

-- Enable Realtime for builds table
-- Supabase manages realtime via the supabase_realtime publication
BEGIN;
  -- Add the builds table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE "Build";
COMMIT;
```

### Task 4: Create Raw SQL Migration for Triggers

**Files:**

- Create: `packages/db/prisma/migrations/XXXXXXXXXXXXXX_triggers/migration.sql`

**Step 1: Write migration for webhook and escalation triggers**

```sql
-- Trigger 1: When commission.status changes to 'COMPLETED', trigger webhook to n8n
-- Supabase provides pg_net extension for webhooks

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_n8n_commission_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Replace URL with actual n8n webhook URL or use env vars / settings table
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_commission_completed
AFTER UPDATE ON "Commission"
FOR EACH ROW
EXECUTE FUNCTION notify_n8n_commission_completed();

-- Trigger 2: When build fails 3 times, escalate to human_review flag
CREATE OR REPLACE FUNCTION check_build_failures()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'FAILED' THEN
        NEW."failureCount" := COALESCE(OLD."failureCount", 0) + 1;

        IF NEW."failureCount" >= 3 THEN
            NEW."humanReview" := true;
            -- Optionally update commission status to ESCALATED
            UPDATE "Commission" SET status = 'ESCALATED' WHERE id = NEW."commissionId";
        END IF;
    END IF;

    -- If status changes to SUCCESS, reset failures? (Optional, based on business logic)
    IF NEW.status = 'SUCCESS' THEN
        NEW."failureCount" := 0;
        NEW."humanReview" := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_build_escalation
BEFORE UPDATE ON "Build"
FOR EACH ROW
EXECUTE FUNCTION check_build_failures();
```

### Task 5: Generate Prisma Client and Run Migrations

**Step 1: Run Prisma tools**

Run `pnpm db:generate` to generate the client.
Note: Since we are writing custom raw SQL migrations alongside Prisma schema changes, we will use `npx prisma migrate dev --create-only` to create the initial schema migration, then manually add our raw SQL migrations, and finally run `npx prisma migrate dev` to apply them all sequentially.
