import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        // Add residual_risk_percent column to risks table
        await query(`
            ALTER TABLE risks 
            ADD COLUMN IF NOT EXISTS residual_risk_percent INTEGER DEFAULT 0;
        `);
        console.log('Added residual_risk_percent column to risks table');

        // Also ensure inherent_risk_score exists as it might be useful later based on fix_schema.sql
        await query(`
            ALTER TABLE risks 
            ADD COLUMN IF NOT EXISTS inherent_risk_score INTEGER DEFAULT 0;
        `);
        console.log('Added inherent_risk_score column to risks table');

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        await closeDatabase();
    }
};

run();
