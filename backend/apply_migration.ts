import { query, connectDatabase } from './src/database/connection';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before everything else
dotenv.config();

async function runMigration() {
    console.log('Starting migration...');
    console.log('DB_PORT from env:', process.env.DB_PORT);
    try {
        console.log('Connecting to database...');
        await connectDatabase();

        const sqlPath = path.join(__dirname, 'src/database/migrations/add_evidence_and_soc2.sql');
        console.log('Reading SQL from:', sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing SQL...');
        await query(sql);
        console.log('Migration applied successfully');
    } catch (error) {
        console.error('Migration failed with error:');
        console.error(error);
        process.exit(1);
    }
}

runMigration().then(() => process.exit(0)).catch((err) => {
    console.error('Unhandled error in runMigration:', err);
    process.exit(1);
});
