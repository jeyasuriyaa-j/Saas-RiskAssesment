import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function checkImportDeep() {
    try {
        await client.connect();

        // Get the most recent import job
        const res = await client.query(`
            SELECT job_id, status, total_rows, processed_rows, failed_rows, error_log, ai_analysis_results, layout_analysis
            FROM import_jobs 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        const job = res.rows[0];
        console.log('Recent Import Job:', JSON.stringify({
            job_id: job?.job_id,
            status: job?.status,
            counts: { total: job?.total_rows, processed: job?.processed_rows, failed: job?.failed_rows },
            has_ai_results: !!job?.ai_analysis_results,
            error_log_sample: job?.error_log ? JSON.stringify(job.error_log).substring(0, 500) : 'None'
        }, null, 2));

        if (job) {
            // Check risk analysis table
            const analysisRes = await client.query(`
                SELECT count(*) as total, 
                       count(*) FILTER (WHERE analysis_status = 'pending') as pending,
                       count(*) FILTER (WHERE analysis_status = 'processing') as processing,
                       count(*) FILTER (WHERE analysis_status = 'done') as done,
                       count(*) FILTER (WHERE analysis_status = 'failed') as failed
                FROM import_risk_analysis 
                WHERE job_id = $1
            `, [job.job_id]);

            console.log('Risk Analysis Stats:', JSON.stringify(analysisRes.rows[0], null, 2));

            // Check for specific errors in analysis
            const failedAnalysis = await client.query(`
                SELECT row_index, error_message FROM import_risk_analysis 
                WHERE job_id = $1 AND analysis_status = 'failed' 
                LIMIT 3
            `, [job.job_id]);

            if (failedAnalysis.rows.length > 0) {
                console.log('Failed Analysis Samples:', JSON.stringify(failedAnalysis.rows, null, 2));
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkImportDeep();
