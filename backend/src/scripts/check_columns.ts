import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'compliance_frameworks';
        `);

        console.log('Columns in compliance_frameworks:');
        console.table(result.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await closeDatabase();
    }
};

run();
