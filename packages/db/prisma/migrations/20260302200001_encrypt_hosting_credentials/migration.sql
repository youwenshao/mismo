-- Encrypt HostingTransfer.clientCredentials using pgsodium (same pattern as Credential table).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgsodium') THEN
    RAISE NOTICE 'pgsodium extension not installed, skipping HostingTransfer encryption trigger';
    RETURN;
  END IF;

  -- Add nonce and keyId columns for pgsodium encryption
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'HostingTransfer' AND column_name = 'credentialNonce'
  ) THEN
    ALTER TABLE "HostingTransfer" ADD COLUMN "credentialNonce" TEXT;
    ALTER TABLE "HostingTransfer" ADD COLUMN "credentialKeyId" TEXT;
  END IF;

  -- Encryption trigger for clientCredentials
  CREATE OR REPLACE FUNCTION encrypt_hosting_credentials()
  RETURNS TRIGGER AS $func$
  DECLARE
    key_id uuid;
    raw_text text;
  BEGIN
    IF NEW."clientCredentials" IS NOT NULL THEN
      SELECT id INTO key_id FROM pgsodium.valid_key LIMIT 1;
      IF key_id IS NOT NULL THEN
        raw_text := NEW."clientCredentials"::text;
        NEW."credentialNonce" := encode(pgsodium.crypto_aead_det_noncegen(), 'base64');
        NEW."clientCredentials" := encode(
          pgsodium.crypto_aead_det_encrypt(
            convert_to(raw_text, 'utf8'),
            convert_to(NEW.id, 'utf8'),
            key_id
          ),
          'base64'
        )::jsonb;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS encrypt_hosting_credentials_trigger ON "HostingTransfer";
  CREATE TRIGGER encrypt_hosting_credentials_trigger
    BEFORE INSERT OR UPDATE OF "clientCredentials" ON "HostingTransfer"
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_hosting_credentials();
END $$;
