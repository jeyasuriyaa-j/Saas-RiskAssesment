import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function fixStuckJob() {
    try {
        await client.connect();

        // Find the stuck job
        const res = await client.query(`
            SELECT job_id FROM import_jobs 
            WHERE status = 'partially_analyzed' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (res.rows.length > 0) {
            const jobId = res.rows[0].job_id;
            console.log(`Found stuck job: ${jobId}. Updating to 'analyzed'...`);

            await client.query(`
                UPDATE import_jobs 
                SET status = 'analyzed', completed_at = NOW() 
                WHERE job_id = $1
            `, [jobId]);

            console.log('Job status updated to analyzed.');
        } else {
            console.log('No stuck jobs found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixStuckJob();
