-- Run: pnpm run db:setup-pgsodium (from packages/db)
-- Or: psql "$DIRECT_URL" -f packages/db/scripts/setup-pgsodium.sql (with .env loaded)
--
-- Prerequisite: Enable pgsodium in Supabase Dashboard → Database → Extensions → pgsodium

CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;

DO $$
BEGIN
  PERFORM pgsodium.create_key(name := 'credential_encryption_key');
END $$;

CREATE OR REPLACE FUNCTION encrypt_credential_token()
RETURNS TRIGGER AS $$
DECLARE
  key_id uuid;
BEGIN
  IF NEW."encryptedTokens" IS NOT NULL THEN
    SELECT id INTO key_id FROM pgsodium.valid_key LIMIT 1;
    IF key_id IS NOT NULL THEN
      NEW."nonce" := encode(pgsodium.crypto_aead_det_noncegen(), 'base64');
      NEW."encryptedTokens" := encode(
        pgsodium.crypto_aead_det_encrypt(
          convert_to(NEW."encryptedTokens", 'utf8'),
          convert_to(NEW."commissionId", 'utf8'),
          key_id
        ),
        'base64'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS encrypt_credential_trigger ON "Credential";
CREATE TRIGGER encrypt_credential_trigger
  BEFORE INSERT OR UPDATE OF "encryptedTokens" ON "Credential"
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_credential_token();
