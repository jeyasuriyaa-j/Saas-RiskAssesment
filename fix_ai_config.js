const { Client } = require('pg');

async function fixConfig() {
    const client = new Client({
        host: '127.0.0.1',
        port: 9000,
        user: 'postgres',
        password: 'password',
        database: 'risk_assessment_db'
    });

    try {
        await client.connect();
        const res = await client.query("SELECT value FROM system_config WHERE key = 'ai_config'");

        let config = res.rows[0]?.value || {};
        console.log('Old config:', config);

        // Update the model to something more stable and not rate limited
        config.model = 'google/gemini-2.5-flash-lite';

        await client.query(
            "UPDATE system_config SET value = $1 WHERE key = 'ai_config'",
            [config]
        );
        console.log('Successfully updated AI model to google/gemini-2.5-flash-lite');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixConfig();
