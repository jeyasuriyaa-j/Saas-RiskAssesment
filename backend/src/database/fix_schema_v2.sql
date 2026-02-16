-- SQL Fix Script V2

-- AI_SUGGESTIONS Table
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';

-- RISK_HISTORY Table
ALTER TABLE risk_history ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Verify if any other columns are missing from remediation_plans
-- (Actually looks okay from previous psql output)
