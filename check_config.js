const { query } = require('./backend/src/database/connection');
const { logger } = require('./backend/src/utils/logger');

async function checkConfig() {
    try {
        const result = await query('SELECT * FROM system_config WHERE key = $1', ['ai_config']);
        console.log('AI Config from DB:', JSON.stringify(result.rows[0]?.value, null, 2));
    } catch (error) {
        console.error('Error querying DB:', error);
    } finally {
        process.exit(0);
    }
}

checkConfig();
