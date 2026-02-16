import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        // 1. Ensure framework_name exists (it should, but for safety)
        await query(`
            ALTER TABLE compliance_frameworks 
            ADD COLUMN IF NOT EXISTS framework_name VARCHAR(100);
        `);
        console.log('Ensured framework_name column exists');

        // 2. Migrate data from 'name' to 'framework_name' if 'name' exists
        // Check if 'name' column exists
        const checkName = await query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'compliance_frameworks' AND column_name = 'name';
        `);

        if (checkName.rows.length > 0) {
            console.log("Column 'name' found. Migrating data to 'framework_name'...");
            await query(`
                UPDATE compliance_frameworks 
                SET framework_name = name 
                WHERE framework_name IS NULL AND name IS NOT NULL;
            `);
            console.log('Data migration complete');

            // 3. Make 'name' nullable so future inserts don't fail if they don't provide it
            await query(`
                ALTER TABLE compliance_frameworks 
                ALTER COLUMN name DROP NOT NULL;
            `);
            console.log("Made 'name' column nullable");
        }

        // 4. Ensure 'framework_name' is set to NOT NULL for data integrity (optional but good)
        // Only if there are no nulls
        const checkNulls = await query(`SELECT COUNT(*) FROM compliance_frameworks WHERE framework_name IS NULL`);
        if (parseInt(checkNulls.rows[0].count) === 0) {
            await query(`
                ALTER TABLE compliance_frameworks 
                ALTER COLUMN framework_name SET NOT NULL;
            `);
            console.log("Set 'framework_name' to NOT NULL");
        } else {
            console.warn("Some rows still have null framework_name. Skipping NOT NULL constraint.");
        }

        // 5. Seed default frameworks if table is essentially empty (no enabled frameworks with tenant_id IS NULL)
        const checkSeeding = await query(`
            SELECT COUNT(*) FROM compliance_frameworks WHERE tenant_id IS NULL
        `);

        if (parseInt(checkSeeding.rows[0].count) === 0) {
            console.log('Seeding default compliance frameworks...');
            // We can safely insert now as 'name' is nullable
            await query(`
                INSERT INTO compliance_frameworks (framework_name, enabled, tenant_id)
                VALUES 
                ('ISO 27001', true, NULL),
                ('SOC 2', true, NULL),
                ('GDPR', true, NULL),
                ('HIPAA', false, NULL)
                ON CONFLICT DO NOTHING;
             `);
            console.log('Seeded default compliance frameworks');
        }

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        await closeDatabase();
    }
};

run();
