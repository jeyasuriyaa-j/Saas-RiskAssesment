-- AI-Powered Risk Assessment - Master Schema Synchronizer
-- This script aligns the database with all backend service requirements.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update ENUM Types
DO $$
BEGIN
    -- Add values to entity_type_enum
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'entity_type_enum' AND e.enumlabel = 'IMPORT') THEN
        ALTER TYPE entity_type_enum ADD VALUE 'IMPORT';
    END IF;
    
    -- Add values to risk_status
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'OPEN') THEN
        ALTER TYPE risk_status ADD VALUE 'OPEN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'IN_PROGRESS') THEN
        ALTER TYPE risk_status ADD VALUE 'IN_PROGRESS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'risk_status' AND e.enumlabel = 'REJECTED') THEN
        ALTER TYPE risk_status ADD VALUE 'REJECTED';
    END IF;
END$$;

-- 3. Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manager_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- 4. Update Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL;

-- 5. Update Risks Table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS inherent_risk_score INTEGER;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS identified_date DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS closed_date DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS current_assignee_ids UUID[];
ALTER TABLE risks ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT NULL;

-- 6. Update Tenants Table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 7. Update Import Jobs Table
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS duplicate_report JSONB;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS validation_level VARCHAR(50);
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS preview_only BOOLEAN DEFAULT false;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 10;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS concurrent_workers INTEGER DEFAULT 5;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS completed_batches INTEGER DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS failed_batches INTEGER DEFAULT 0;

-- 8. Create Import Risk Analysis Table
CREATE TABLE IF NOT EXISTS import_risk_analysis (
    analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES import_jobs(job_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    row_hash VARCHAR(64) NOT NULL,
    original_title TEXT,
    original_description TEXT,
    original_category VARCHAR(100),
    original_likelihood INTEGER,
    original_impact INTEGER,
    analysis_status VARCHAR(20) DEFAULT 'pending',
    analysis_attempts INTEGER DEFAULT 0,
    last_analysis_at TIMESTAMP,
    ai_result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, row_index)
);

-- 9. Create AI Analysis Cache
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    row_hash VARCHAR(64) NOT NULL,
    ai_result JSONB NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_hit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, row_hash)
);

-- 10. Update AI Suggestions Table
-- Rename suggestion_id to request_id if it exists as suggestion_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_suggestions' AND column_name = 'suggestion_id') THEN
        ALTER TABLE ai_suggestions RENAME COLUMN suggestion_id TO request_id;
    END IF;
END$$;
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS suggestion JSONB;
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 11. Create Risk History Table
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

-- 12. Update Controls Table
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_code VARCHAR(50);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_percent INTEGER; -- For spec alignment

-- 13. Create Notifications Table (if missing)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Create Evidence Table (requested in evidence routes)
CREATE TABLE IF NOT EXISTS evidence (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    control_id UUID REFERENCES controls(control_id) ON DELETE SET NULL,
    risk_id UUID REFERENCES risks(risk_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    description TEXT,
    tags VARCHAR[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
