import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const port = parseInt(process.env.DB_PORT || '5432');
console.log(`Configured Port: ${port}`);
console.log(`Configured Host: ${process.env.DB_HOST}`);

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'risk_assessment_db',
    password: process.env.DB_PASSWORD,
    port: port,
});

async function applyFix() {
    console.log('Applying Master Schema Fix...');
    const fixPath = path.join(__dirname, '../database/master_fix_schema.sql');

    try {
        const sql = fs.readFileSync(fixPath, 'utf8');

        // Split by semicolon but handle the DO $$ blocks which contain semicolons
        // Simple approach: Run the whole thing as one block if possible, or use a regex
        // Better: pg client can run multiple statements in one query call if they are separated by semicolons

        console.log('Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('Executing SQL...');
            await client.query(sql);
            console.log('✅ Master Schema Fix applied successfully.');
        } catch (error) {
            console.error('❌ SQL Execution failed:', error);
            process.exit(1);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Preparation failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyFix();
