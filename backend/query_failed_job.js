require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        await connectDatabase();
        const jobId = 'b426a00b-bc49-4d74-8248-038e6063d8bc';
        const result = await query('SELECT status, ai_analysis_results, layout_analysis, column_mapping FROM import_jobs WHERE job_id = $1', [jobId]);
        console.log('JOB_STATUS:', result.rows[0]?.status);
        console.log('AI_RESULTS:', JSON.stringify(result.rows[0]?.ai_analysis_results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
