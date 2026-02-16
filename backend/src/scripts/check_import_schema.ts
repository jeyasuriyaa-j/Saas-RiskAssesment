
import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();

        // Check columns in import_risk_analysis
        const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'import_risk_analysis'
      ORDER BY ordinal_position;
    `);

        console.log('Columns in import_risk_analysis:');
        console.table(result.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await closeDatabase();
    }
};

run();
