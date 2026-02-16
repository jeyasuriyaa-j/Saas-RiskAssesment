-- Add analysis column to risks table to store AI analysis results
ALTER TABLE risks ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT NULL;
