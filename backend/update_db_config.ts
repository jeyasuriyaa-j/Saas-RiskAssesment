import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function updateConfig() {
    try {
        await client.connect();

        // Fetch current config
        const res = await client.query('SELECT value FROM system_config WHERE key = $1', ['ai_config']);
        let config = res.rows[0]?.value || {};

        // Update model
        config.model = 'openrouter/aurora-alpha';

        // Save back
        await client.query('UPDATE system_config SET value = $1 WHERE key = $2', [JSON.stringify(config), 'ai_config']);

        console.log('Updated AI Config:', JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

updateConfig();
