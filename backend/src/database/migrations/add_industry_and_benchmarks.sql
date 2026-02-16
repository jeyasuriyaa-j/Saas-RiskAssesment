-- Add industry column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

-- Create Industry Risks table
CREATE TABLE IF NOT EXISTS industry_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    statement TEXT NOT NULL,
    description TEXT,
    typical_impact INTEGER, -- 1-5 scale (mapped to severity enum in logic if needed)
    typical_likelihood INTEGER, -- 1-5 scale
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Industry Benchmarks table
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    industry VARCHAR(100) NOT NULL,
    risk_category VARCHAR(100) NOT NULL,
    avg_likelihood NUMERIC(5,2),
    avg_impact NUMERIC(5,2),
    risk_count INTEGER,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(industry, risk_category)
);

CREATE INDEX IF NOT EXISTS idx_industry_benchmarks ON industry_benchmarks(industry);
