import { query, connectDatabase } from './database/connection';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkConfig() {
    try {
        await connectDatabase();
        const result = await query('SELECT key, value FROM system_config WHERE key = $1', ['ai_config']);
        console.log('AI Configuration in Database:');
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error: any) {
        console.error('Failed to query database:', error.message);
    } finally {
        process.exit();
    }
}

checkConfig();
