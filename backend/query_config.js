require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function run() {
    try {
        console.log('Connecting to database...');
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_PORT:', process.env.DB_PORT);

        await connectDatabase();
        const result = await query('SELECT * FROM system_config');
        console.log('CONFIG_RESULTS:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('DATABASE_ERROR:', error);
        process.exit(1);
    }
}

run();
