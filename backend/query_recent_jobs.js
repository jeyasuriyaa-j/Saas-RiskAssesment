require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        await connectDatabase();
        const result = await query('SELECT job_id, status, created_at FROM import_jobs ORDER BY created_at DESC LIMIT 5');
        console.log('RECENT_JOBS:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('DATABASE_ERROR:', error);
        process.exit(1);
    }
}

run();
