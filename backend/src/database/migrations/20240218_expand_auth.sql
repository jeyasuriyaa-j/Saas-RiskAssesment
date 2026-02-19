-- Migration: Expand Auth Support
-- Added: 2024-02-18

-- Update users table for Microsoft ID and MFA
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

-- Create table for Magic Links
CREATE TABLE IF NOT EXISTS magic_links (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create table for WebAuthn Credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    credential_id BYTEA PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    public_key BYTEA NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type VARCHAR(50),
    backed_up BOOLEAN DEFAULT FALSE,
    transports TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
