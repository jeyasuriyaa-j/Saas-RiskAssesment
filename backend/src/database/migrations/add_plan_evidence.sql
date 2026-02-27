-- Create table for storing remediation evidence metadata
CREATE TABLE IF NOT EXISTS plan_evidence (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES remediation_plans(plan_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes INTEGER,
    file_path VARCHAR(500),
    uploaded_by UUID REFERENCES users(user_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by plan_id
CREATE INDEX idx_plan_evidence_plan_id ON plan_evidence(plan_id);
