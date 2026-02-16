-- AI-Based Risk Assessment SaaS - Vibe Spec Aligned Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE sub_tier AS ENUM ('free', 'growth', 'enterprise');
CREATE TYPE risk_status AS ENUM ('DRAFT', 'ACTIVE', 'MITIGATED', 'CLOSED', 'DELETED');
CREATE TYPE control_type_enum AS ENUM ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE');
CREATE TYPE implementation_status_enum AS ENUM ('DESIGNED', 'IMPLEMENTED', 'OPTIMIZED');
CREATE TYPE test_results_enum AS ENUM ('PASSED', 'FAILED', 'PARTIAL');
CREATE TYPE mitigation_strength_enum AS ENUM ('STRONG', 'MODERATE', 'WEAK');
CREATE TYPE exposure_level_enum AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE mapping_source AS ENUM ('AI', 'MANUAL');
CREATE TYPE user_action_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED');
CREATE TYPE entity_type_enum AS ENUM ('RISK', 'CONTROL', 'MAPPING', 'CONFIG', 'USER');
CREATE TYPE action_enum AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ACCEPT', 'REJECT');
CREATE TYPE event_type_enum AS ENUM ('INCIDENT', 'KPI_BREACH', 'VENDOR_CHANGE', 'POLICY_CHANGE');
CREATE TYPE severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ============================================
-- TENANTS (Multi-tenant Organizations)
-- ============================================
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier sub_tier NOT NULL DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    risk_model_config JSONB DEFAULT '{}',
    scoring_config JSONB DEFAULT '{}',
    risk_appetite_config JSONB DEFAULT '{}',
    ai_config JSONB DEFAULT '{}',
    governance_config JSONB DEFAULT '{}',
    compliance_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_role CHECK (role IN ('admin', 'risk_manager', 'viewer', 'auditor', 'user')),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ============================================
-- RISKS (Core Table)
-- ============================================
CREATE TABLE risks (
    risk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    risk_code VARCHAR(50),
    statement TEXT NOT NULL,
    category VARCHAR(100),
    owner_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    causes JSONB DEFAULT '[]',
    impacts JSONB DEFAULT '[]',
    status risk_status DEFAULT 'DRAFT',
    likelihood_score INTEGER,
    impact_score INTEGER,
    custom_score INTEGER,
    residual_risk_percent INTEGER,
    review_cycle_days INT DEFAULT 90,
    last_reviewed_at TIMESTAMP,
    next_review_due_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    custom_fields JSONB DEFAULT '{}',
    
    UNIQUE(tenant_id, risk_code)
);

CREATE INDEX idx_tenant_status ON risks (tenant_id, status);
CREATE INDEX idx_owner ON risks (tenant_id, owner_user_id);
CREATE INDEX idx_next_review ON risks (tenant_id, next_review_due_at);

-- ============================================
-- CONTROLS
-- ============================================
CREATE TABLE controls (
    control_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    control_name VARCHAR(255) NOT NULL,
    description TEXT,
    control_type control_type_enum,
    implementation_status implementation_status_enum DEFAULT 'DESIGNED',
    implementation_percent INT,
    last_tested_at TIMESTAMP,
    test_results test_results_enum,
    effectiveness_percent INT,
    owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_controls_tenant ON controls (tenant_id);
CREATE INDEX idx_controls_status ON controls (tenant_id, implementation_status);

-- ============================================
-- RISK-CONTROL MAPPINGS
-- ============================================
CREATE TABLE risk_control_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    control_id UUID NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
    mitigation_strength mitigation_strength_enum,
    controls_what_percent INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(risk_id, control_id)
);

CREATE INDEX idx_mapping_risk ON risk_control_mappings (risk_id);
CREATE INDEX idx_mapping_control ON risk_control_mappings (control_id);

-- ============================================
-- COMPLIANCE
-- ============================================
CREATE TABLE compliance_frameworks (
    framework_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    framework_name VARCHAR(100),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, framework_name)
);

CREATE TABLE compliance_clauses (
    clause_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(framework_id) ON DELETE CASCADE,
    clause_number VARCHAR(20),
    clause_text TEXT,
    description TEXT
);

CREATE TABLE risk_regulation_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    clause_id UUID NOT NULL REFERENCES compliance_clauses(clause_id) ON DELETE CASCADE,
    exposure_level exposure_level_enum,
    mapped_by mapping_source,
    confidence_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(risk_id, clause_id)
);

-- ============================================
-- AI SUGGESTIONS (Aligned with User Spec)
-- ============================================
CREATE TABLE ai_suggestions (
    suggestion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID UNIQUE DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    risk_id UUID REFERENCES risks(risk_id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    prompt_id VARCHAR(50),
    prompt_version VARCHAR(10),
    suggestion_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING',
    suggestion JSONB,
    confidence_score INT,
    model_used VARCHAR(100),
    user_action user_action_enum DEFAULT 'PENDING',
    feedback_rating INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_tenant ON ai_suggestions (tenant_id);
CREATE INDEX idx_ai_risk ON ai_suggestions (risk_id);
CREATE INDEX idx_ai_status ON ai_suggestions (user_action);
CREATE INDEX idx_ai_request ON ai_suggestions (request_id);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    entity_type entity_type_enum,
    entity_id UUID,
    action action_enum,
    changes JSONB,
    actor_user_id UUID NOT NULL,
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    immutable BOOLEAN DEFAULT true
);

CREATE INDEX idx_tenant_timestamp ON audit_log (tenant_id, timestamp DESC);
CREATE INDEX idx_entity ON audit_log (entity_type, entity_id);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    event_type event_type_enum,
    event_name VARCHAR(255),
    description TEXT,
    severity severity_enum,
    occurred_at TIMESTAMP,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    affected_risk_ids UUID[],
    ai_assessment_completed BOOLEAN DEFAULT false,
    created_by_user_id UUID
);

CREATE INDEX idx_events_tenant ON events (tenant_id);
CREATE INDEX idx_events_occurred ON events (occurred_at);

-- ============================================
-- IMPORT JOBS
-- ============================================
CREATE TABLE import_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    file_size_bytes INT,
    status VARCHAR(50) DEFAULT 'processing',
    total_rows INT DEFAULT 0,
    processed_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    imported_risk_ids UUID[] DEFAULT '{}',
    column_mapping JSONB,
    mapping_confidence INT,
    layout_analysis JSONB,
    validation_report JSONB,
    error_log JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_import_tenant ON import_jobs (tenant_id);
CREATE INDEX idx_import_status ON import_jobs (status);

-- ============================================
-- REMEDIATION PLANS (Sprint 9)
-- ============================================
CREATE TABLE remediation_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    action_title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'OPEN',
    ai_suggested BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_remediation_risk ON remediation_plans (risk_id);
CREATE INDEX idx_remediation_tenant ON remediation_plans (tenant_id);
