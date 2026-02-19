import { connectDatabase, query, closeDatabase } from './database/connection';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

async function runMigration() {
    try {
        logger.info('Starting Auth Expansion migration...');
        await connectDatabase();

        const sqlPath = path.join(__dirname, 'database', 'migrations', '20240218_expand_auth.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and run each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            logger.info(`Executing statement: ${statement.substring(0, 50)}...`);
            await query(statement);
        }

        logger.info('Auth Expansion migration completed successfully!');
    } catch (error) {
        logger.error('Migration failed:', error);
    } finally {
        await closeDatabase();
        process.exit(0);
    }
}

runMigration();
