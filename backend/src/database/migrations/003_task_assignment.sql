-- Migration: Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add index for department queries
CREATE INDEX IF NOT EXISTS idx_users_department ON users (tenant_id, department);

-- Add priority column to remediation_plans if not exists
ALTER TABLE remediation_plans ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM';

COMMENT ON COLUMN users.department IS 'Department for task assignment routing';
