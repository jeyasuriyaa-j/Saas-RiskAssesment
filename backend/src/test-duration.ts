import { processBatchesHighPerf } from './services/batchAnalysis.service';
import { logger } from './utils/logger';
import { connectDatabase, query } from './database/connection';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const jobId = 'a0eebc99-9c0b-4d7a-8d1e-0123456789ac';
const tenantId = '044e11af-1890-4840-ae06-83171974bac4';

async function setup() {
    await connectDatabase();

    // Clean up old test data
    await query(`DELETE FROM import_risk_analysis WHERE job_id = $1`, [jobId]);
    await query(`DELETE FROM import_jobs WHERE job_id = $1`, [jobId]);

    // Create test job
    await query(
        `INSERT INTO import_jobs (job_id, tenant_id, status, total_rows, completed_batches, failed_batches) 
     VALUES ($1, $2, 'analyzing', 5, 0, 0)`,
        [jobId, tenantId]
    );

    // Create 5 test risks
    for (let i = 0; i < 5; i++) {
        await query(
            `INSERT INTO import_risk_analysis (job_id, tenant_id, row_index, row_hash, original_title, original_description, analysis_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [jobId, tenantId, i, `hash-${i}`, `Test Risk ${i}`, `Description for risk ${i}`]
        );
    }
}

async function run() {
    logger.info(`[TEST] Starting duration demonstration...`);
    try {
        await setup();

        // Run the actual processor
        await processBatchesHighPerf(jobId, tenantId, 5);

        logger.info(`[TEST] Demonstration complete. Check logs for total duration!`);
        process.exit(0);
    } catch (error) {
        logger.error(`[TEST] Failed:`, error);
        process.exit(1);
    }
}

run();
