require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        await connectDatabase();
        const jobId = '7b5c4bf0-958f-43b7-a4e0-44a3cdd59bd0';
        const result = await query('SELECT column_mapping, layout_analysis FROM import_jobs WHERE job_id = $1', [jobId]);
        console.log('MAPPING_DETAILS:');
        console.log(JSON.stringify(result.rows[0], null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
