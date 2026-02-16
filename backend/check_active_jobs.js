require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        await connectDatabase();
        const result = await query(
            "SELECT job_id, status, total_batches, completed_batches, failed_batches, created_at FROM import_jobs WHERE status IN ('processing', 'analyzing', 'mapping') ORDER BY created_at DESC"
        );
        console.log('ACTIVE_JOBS:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
