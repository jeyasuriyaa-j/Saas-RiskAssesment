const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'risk_assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

const sqlCommands = [
    // 1. Add change_reason to risk_history
    "ALTER TABLE risk_history ADD COLUMN IF NOT EXISTS change_reason TEXT;",

    // 2. Add priority to remediation_plans
    "ALTER TABLE remediation_plans ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM';",

    // 3. Add department_id to risks
    "ALTER TABLE risks ADD COLUMN IF NOT EXISTS department_id UUID;",

    // 4. Add missing enum values (using DO blocks to handle 'already exists' safely if needed, or just individual calls)
    "ALTER TYPE action_enum ADD VALUE IF NOT EXISTS 'BULK_IMPORT_WITH_AI_REVIEW_COMPLETED';",
    "ALTER TYPE entity_type_enum ADD VALUE IF NOT EXISTS 'TASK_ASSIGNMENT';",
    "ALTER TYPE entity_type_enum ADD VALUE IF NOT EXISTS 'IMPORT';",
    "ALTER TYPE entity_type_enum ADD VALUE IF NOT EXISTS 'REMEDIATION_SUGGESTION';",
    "ALTER TYPE entity_type_enum ADD VALUE IF NOT EXISTS 'REMEDIATION';"
];

async function runFixes() {
    const client = await pool.connect();
    console.log('Connected to database successfully.');

    for (const sql of sqlCommands) {
        try {
            console.log(`Executing: ${sql}`);
            await client.query(sql);
            console.log('Success.');
        } catch (err) {
            if (err.code === '42710') { // duplicate_object (for enum values sometimes)
                console.log('Skipping: Value already exists.');
            } else {
                console.error(`Error executing ${sql}:`, err.message);
            }
        }
    }

    client.release();
    await pool.end();
    console.log('Database fixes completed.');
}

runFixes().catch(err => {
    console.error('Fatal error running fixes:', err);
    process.exit(1);
});
