-- SQL Fix Script to align database with backend code expectations

-- RISKS Table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS inherent_risk_score INTEGER;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS identified_date DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS closed_date DATE;

-- TENANTS Table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- IMPORT_JOBS Table
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS duplicate_report JSONB;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS validation_level VARCHAR(50);
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS preview_only BOOLEAN DEFAULT false;

-- AI_SUGGESTIONS Table
-- The code uses request_id, but schema has suggestion_id
ALTER TABLE ai_suggestions RENAME COLUMN suggestion_id TO request_id;
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS suggestion JSONB;
-- Ensure updated_at exists
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- RISK_HISTORY Table (requested in risk.routes.ts:781)
CREATE TABLE IF NOT EXISTS risk_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID REFERENCES risks(risk_id) ON DELETE CASCADE,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(50),
    changed_by UUID,
    old_value TEXT,
    new_value TEXT,
    field_name VARCHAR(100)
);

-- CONTROLS Table (requested in risk.routes.ts:132)
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_code VARCHAR(50);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER;

-- Ensure auditService uses audit_log table or risk_history? 
-- The code seems to use both risk_history and audit_log.
