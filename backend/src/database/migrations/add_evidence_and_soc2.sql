-- Create Evidence Table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    control_id UUID NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence(tenant_id);

-- Seed SOC2 Framework (Using a temporary function to avoid duplication if run multiple times)
DO $$
DECLARE
    soc2_fw_id UUID;
BEGIN
    -- Insert Framework if not exists
    -- We use a dummy tenant_id '00000000-0000-0000-0000-000000000000' or NULL for global frameworks
    -- Since the schema enforces tenant_id, we might need to handle this. 
    -- However, the schema for compliance_frameworks has `tenant_id UUID NOT NULL`.
    -- For 'Global' frameworks, we should either relax that constraint or insert for specific tenants.
    -- Given the current schema, let's assume this script is enabling it for the current context or we need to handle it in code.
    -- BUT, `compliance.routes.ts` queries `WHERE tenant_id = $1 OR tenant_id IS NULL`.
    -- So we should insert with NULL tenant_id if allowed. 
    -- Let's check schema: `tenant_id UUID NOT NULL`.
    -- OK, we need to alter column to allow NULL for global frameworks.
    
    BEGIN
        ALTER TABLE compliance_frameworks ALTER COLUMN tenant_id DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL; -- Ignore if already nullable
    END;

    INSERT INTO compliance_frameworks (framework_name, enabled, tenant_id)
    VALUES ('SOC2 Type II', true, NULL)
    ON CONFLICT (tenant_id, framework_name) DO NOTHING
    RETURNING framework_id INTO soc2_fw_id;

    -- If we didn't insert (conflict), get the ID
    IF soc2_fw_id IS NULL THEN
        SELECT framework_id INTO soc2_fw_id FROM compliance_frameworks WHERE framework_name = 'SOC2 Type II' AND tenant_id IS NULL;
    END IF;

    -- Insert Common Criteria (Sample set)
    IF soc2_fw_id IS NOT NULL THEN
        INSERT INTO compliance_clauses (framework_id, clause_number, clause_text, description) VALUES
        (soc2_fw_id, 'CC1.1', 'The entity demonstrates a commitment to integrity and ethical values.', 'COSO Principle 1'),
        (soc2_fw_id, 'CC1.2', 'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.', 'COSO Principle 2'),
        (soc2_fw_id, 'CC6.1', 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity''s objectives.', 'Logical Access')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
