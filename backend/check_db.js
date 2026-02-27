
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'risk_assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
});

async function checkAIStatus() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query('SELECT request_id, event_id, status, created_at, updated_at FROM ai_suggestions ORDER BY created_at DESC LIMIT 5');
        console.log('Recent AI Suggestions:');
        console.table(res.rows);

        const configRes = await client.query("SELECT * FROM system_config WHERE key = 'ai_config'");
        console.log('\nAI Config in DB:');
        if (configRes.rows.length > 0) {
            console.log(JSON.stringify(configRes.rows[0].value, null, 2));
        } else {
            console.log('No ai_config found in system_config table.');
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkAIStatus();
