import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function getIds() {
    try {
        const res = await pool.query('SELECT user_id, tenant_id FROM users WHERE role = \'admin\' LIMIT 1');
        console.log(JSON.stringify(res.rows[0]));
    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

getIds();
