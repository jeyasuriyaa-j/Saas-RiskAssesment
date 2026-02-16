import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function checkAIResults() {
    try {
        await client.connect();

        const res = await client.query(`
            SELECT row_index, ai_result 
            FROM import_risk_analysis 
            WHERE job_id = (SELECT job_id FROM import_jobs ORDER BY created_at DESC LIMIT 1)
            LIMIT 3
        `);

        console.log('Sample AI Results from DB:');
        res.rows.forEach(row => {
            console.log(`Row ${row.row_index}:`, JSON.stringify(row.ai_result, null, 2));
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkAIResults();
