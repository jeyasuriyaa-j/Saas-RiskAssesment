import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    // Force IPv4 loopback
    const host = '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '9000');

    console.log(`Connecting to ${host}:${port}...`);

    const client = new Client({
        host: host,
        port: port,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'risk_assessment_db',
    });

    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0].now);
        await client.end();
    } catch (err: any) {
        console.error('Connection failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
    }
}

check();
