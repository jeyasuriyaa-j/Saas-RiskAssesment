-- Migration: Add task workflow fields to remediation_plans
-- Date: 2026-02-11

-- Add new columns for task workflow
ALTER TABLE remediation_plans 
ADD COLUMN IF NOT EXISTS action_plan TEXT,
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create task_files table for file uploads
CREATE TABLE IF NOT EXISTS task_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES remediation_plans(plan_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_tenant_id ON task_files(tenant_id);

-- Add comment
COMMENT ON TABLE task_files IS 'Stores file attachments for remediation tasks';
