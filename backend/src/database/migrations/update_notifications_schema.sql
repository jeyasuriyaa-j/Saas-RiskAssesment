-- Update existing notifications table schema
-- Add missing columns for risk assignment notifications

ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS risk_id UUID REFERENCES risks(risk_id) ON DELETE CASCADE;

-- Rename is_read to read for consistency
ALTER TABLE notifications 
  RENAME COLUMN is_read TO read;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risks_assigned_to ON risks(assigned_to);
