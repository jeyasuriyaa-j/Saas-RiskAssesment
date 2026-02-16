-- Migration: Batch AI Analysis Support
-- Adds fields for tracking individual risk analysis status and caching

-- Add analysis status enum
CREATE TYPE risk_analysis_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- Add new columns to import_jobs table for batch tracking
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 10;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS concurrent_workers INTEGER DEFAULT 5;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS completed_batches INTEGER DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS failed_batches INTEGER DEFAULT 0;

-- Create table for individual risk analysis results (per-row tracking)
CREATE TABLE IF NOT EXISTS import_risk_analysis (
    analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES import_jobs(job_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    row_hash VARCHAR(64) NOT NULL, -- SHA256 hash of title + description for caching
    
    -- Original data
    original_title TEXT,
    original_description TEXT,
    original_category VARCHAR(100),
    original_likelihood INTEGER,
    original_impact INTEGER,
    
    -- Analysis status
    analysis_status risk_analysis_status DEFAULT 'pending',
    analysis_attempts INTEGER DEFAULT 0,
    last_analysis_at TIMESTAMP,
    
    -- AI Results (JSONB for flexibility)
    ai_result JSONB,
    
    -- Error tracking
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate rows per job
    UNIQUE(job_id, row_index)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_import_risk_analysis_job_id ON import_risk_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_import_risk_analysis_status ON import_risk_analysis(job_id, analysis_status);
CREATE INDEX IF NOT EXISTS idx_import_risk_analysis_hash ON import_risk_analysis(tenant_id, row_hash);
CREATE INDEX IF NOT EXISTS idx_import_risk_analysis_pending ON import_risk_analysis(job_id, analysis_status) WHERE analysis_status = 'pending';

-- Create AI result cache table (cross-job caching)
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    row_hash VARCHAR(64) NOT NULL,
    
    -- Cached AI result
    ai_result JSONB NOT NULL,
    
    -- Metadata
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_hit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for cache lookup
    UNIQUE(tenant_id, row_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_lookup ON ai_analysis_cache(tenant_id, row_hash);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for import_risk_analysis
DROP TRIGGER IF EXISTS update_import_risk_analysis_updated_at ON import_risk_analysis;
CREATE TRIGGER update_import_risk_analysis_updated_at
    BEFORE UPDATE ON import_risk_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for ai_analysis_cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hit_count = OLD.hit_count + 1;
    NEW.last_hit_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cache_hit ON ai_analysis_cache;
CREATE TRIGGER update_cache_hit
    BEFORE UPDATE ON ai_analysis_cache
    FOR EACH ROW
    EXECUTE FUNCTION increment_cache_hit();
