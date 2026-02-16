
import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();

        console.log('Creating ai_analysis_cache table...');
        await query(`
      CREATE TABLE IF NOT EXISTS ai_analysis_cache (
        cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL,
        row_hash VARCHAR(64) NOT NULL,
        ai_result JSONB NOT NULL,
        hit_count INT DEFAULT 0,
        last_hit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, row_hash)
      );
    `);

        console.log('Creating import_risk_analysis table...');
        await query(`
      CREATE TABLE IF NOT EXISTS import_risk_analysis (
        analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES import_jobs(job_id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        row_index INT NOT NULL,
        row_hash VARCHAR(64),
        original_title TEXT,
        original_description TEXT,
        original_category VARCHAR(100),
        original_likelihood INT,
        original_impact INT,
        analysis_status VARCHAR(20) DEFAULT 'pending',
        analysis_attempts INT DEFAULT 0,
        ai_result JSONB,
        error_message TEXT,
        last_analysis_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, row_index)
      );
    `);

        // Indices for performance
        await query(`CREATE INDEX IF NOT EXISTS idx_import_analysis_job ON import_risk_analysis(job_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_import_analysis_status ON import_risk_analysis(job_id, analysis_status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_analysis_cache(tenant_id, row_hash);`);

        console.log('Tables created successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await closeDatabase();
    }
};

run();
