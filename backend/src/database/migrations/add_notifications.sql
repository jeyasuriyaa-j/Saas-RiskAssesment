-- Migration: Add Risk Assignment and Notifications
-- Created: 2024-02-10

-- Add assignment columns to risks table
ALTER TABLE risks 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(risk_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risks_assigned_to ON risks(assigned_to);
