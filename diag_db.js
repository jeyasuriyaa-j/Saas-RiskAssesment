const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/swot_risk'
});

async function run() {
    await client.connect();
    try {
        console.log('--- JOB STATUS ---');
        const jobs = await client.query('SELECT job_id, status, total_batches, completed_batches, failed_batches FROM import_jobs ORDER BY created_at DESC LIMIT 5');
        console.table(jobs.rows);

        if (jobs.rows.length > 0) {
            const jobId = jobs.rows[0].job_id;
            console.log(`\n--- DETAILS FOR LATEST JOB: ${jobId} ---`);
            const details = await client.query(`
        SELECT 
          analysis_status, 
          COUNT(*) as count 
        FROM import_risk_analysis 
        WHERE job_id = $1 
        GROUP BY analysis_status
      `, [jobId]);
            console.table(details.rows);

            const processing = await client.query('SELECT row_index, analysis_attempts FROM import_risk_analysis WHERE job_id = $1 AND analysis_status = $2 LIMIT 10', [jobId, 'processing']);
            if (processing.rows.length > 0) {
                console.log('\n--- SAMPLES OF "PROCESSING" ROWS ---');
                console.table(processing.rows);
            }
        }
    } finally {
        await client.end();
    }
}
run();
