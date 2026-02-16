import { processBatchesHighPerf } from './services/batchAnalysis.service';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    logger.info(`[RESUME] Starting scan for stalled jobs...`);
    try {
        await connectDatabase();

        // We target the known job and tenant
        const jobId = '03f45540-2e0c-442b-be06-2370d0b347b7';
        const tenantId = '044e11af-1890-4840-ae06-83171974bac4';
        const totalRows = 1000;

        logger.info(`[RESUME] Found stalled job ${jobId}. Resuming...`);
        await processBatchesHighPerf(jobId, tenantId, totalRows);

        logger.info(`[RESUME] Job ${jobId} completed successfully`);
        process.exit(0);
    } catch (error) {
        logger.error(`[RESUME] Failed to resume jobs:`, error);
        process.exit(1);
    }
}

run();
