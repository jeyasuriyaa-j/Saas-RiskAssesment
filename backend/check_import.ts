import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function checkImport() {
    try {
        await client.connect();

        // Get the most recent import job
        const res = await client.query(`
            SELECT job_id, status, total_rows, processed_rows, failed_rows, imported_risk_ids, error_log 
            FROM import_jobs 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        console.log('Recent Import Job:', JSON.stringify(res.rows[0], null, 2));

        if (res.rows.length > 0) {
            const riskIds = res.rows[0].imported_risk_ids || [];
            if (riskIds.length > 0) {
                const risks = await client.query('SELECT risk_code, statement FROM risks WHERE risk_id = ANY($1)', [riskIds]);
                console.log('Imported Risks Sample:', JSON.stringify(risks.rows.slice(0, 3), null, 2));
            } else {
                console.log('No risk IDs found in imported_risk_ids column.');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkImport();
