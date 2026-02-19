-- Migration: Add SSO Support
-- Adds Google ID and SSO configuration support for multi-tenancy.

-- 1. Update tenants table for SSO configuration
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS sso_config JSONB DEFAULT '{}';

-- 2. Update users table for SSO linking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS sso_external_id VARCHAR(255);

-- Create index for faster SSO lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_sso_external_id ON users(sso_external_id);

COMMENT ON COLUMN tenants.sso_config IS 'Stores SAML/OIDC configuration (ClientID, ClientSecret, Issuer, etc.)';
COMMENT ON COLUMN users.google_id IS 'Linked Google account ID';
COMMENT ON COLUMN users.sso_provider IS 'Identity provider used for SSO (e.g., google, azure, okta)';
