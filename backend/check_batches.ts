import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function checkBatches() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT job_id, status, total_rows, total_batches, completed_batches, failed_batches 
            FROM import_jobs 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        console.log('Batch Info:', JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkBatches();
