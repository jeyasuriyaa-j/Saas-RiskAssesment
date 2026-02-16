require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        await connectDatabase();
        const jobId = '7b5c4bf0-958f-43b7-a4e0-44a3cdd59bd0';
        const result = await query('SELECT * FROM import_jobs WHERE job_id = $1', [jobId]);
        console.log('JOB_DETAILS:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('DATABASE_ERROR:', error);
        process.exit(1);
    }
}

run();
