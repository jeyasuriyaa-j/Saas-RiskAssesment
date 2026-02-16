-- Migration: Add missing columns to ai_suggestions table
-- Run this on existing databases to align with the spec

-- Add request_id column for async polling
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS request_id UUID UNIQUE DEFAULT uuid_generate_v4();

-- Add event_id column for event impact assessments
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(event_id) ON DELETE SET NULL;

-- Add status column for workflow tracking
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';

-- Rename ai_output to suggestion if it exists (for consistency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ai_suggestions' AND column_name = 'ai_output') THEN
        ALTER TABLE ai_suggestions RENAME COLUMN ai_output TO suggestion;
    END IF;
END $$;

-- Add suggestion column if it doesn't exist
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS suggestion JSONB;

-- Add metadata columns per spec
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(10);

ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS confidence_score INT;

ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS model_used VARCHAR(100);

ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS feedback_rating INT;

ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for request_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_request ON ai_suggestions (request_id);

-- Update existing rows to have request_id if null
UPDATE ai_suggestions SET request_id = uuid_generate_v4() WHERE request_id IS NULL;

COMMENT ON TABLE ai_suggestions IS 'AI-generated suggestions for risks and events (Spec V1.1-V2.3)';
