import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        // Check if compliance_frameworks table exists
        const checkTable = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'compliance_frameworks'
            );
        `);

        if (!checkTable.rows[0].exists) {
            console.log('compliance_frameworks table does not exist. Creating it...');
            await query(`
                CREATE TABLE compliance_frameworks (
                    framework_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
                    framework_name VARCHAR(100),
                    enabled BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(tenant_id, framework_name)
                );
            `);
            console.log('Created compliance_frameworks table');
        } else {
            console.log('compliance_frameworks table exists. Checking for tenant_id...');
            // Check if tenant_id column exists
            try {
                await query('SELECT tenant_id FROM compliance_frameworks LIMIT 1');
                console.log('tenant_id column exists');
            } catch (err: any) {
                if (err.code === '42703') { // Undefined column
                    console.log('tenant_id column missing. Adding it...');
                    await query(`
                        ALTER TABLE compliance_frameworks 
                        ADD COLUMN tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE;
                    `);
                    console.log('Added tenant_id column');
                } else {
                    throw err;
                }
            }
        }

        // Check compliance_clauses table
        await query(`
            CREATE TABLE IF NOT EXISTS compliance_clauses (
                clause_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                framework_id UUID NOT NULL REFERENCES compliance_frameworks(framework_id) ON DELETE CASCADE,
                clause_number VARCHAR(20),
                clause_text TEXT,
                description TEXT
            );
        `);
        console.log('Ensured compliance_clauses table exists');

        // Check risk_regulation_mappings table
        await query(`
           CREATE TABLE IF NOT EXISTS risk_regulation_mappings (
                mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
                risk_id UUID NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
                clause_id UUID NOT NULL REFERENCES compliance_clauses(clause_id) ON DELETE CASCADE,
                exposure_level VARCHAR(20),
                mapped_by VARCHAR(20),
                confidence_score INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(risk_id, clause_id)
            );
        `);
        console.log('Ensured risk_regulation_mappings table exists');

        // Seed some default frameworks if empty
        const count = await query('SELECT COUNT(*) FROM compliance_frameworks');
        if (parseInt(count.rows[0].count) === 0) {
            // We need a tenant_id to insert default frameworks if they are tenant specific. 
            // But the schema allows nullable tenant_id? The previous code had "OR tenant_id IS NULL".
            // Let's check the schema I used above: `tenant_id UUID REFERENCES tenants(tenant_id)`.
            // If I put NOT NULL it might break if I want global frameworks.
            // The query in analytics.service.ts uses: `WHERE tenant_id = $1 OR tenant_id IS NULL`
            // So it expects some to be NULL (global).

            // Let's Insert some global frameworks (tenant_id = NULL)
            await query(`
                INSERT INTO compliance_frameworks (framework_name, enabled, tenant_id)
                VALUES 
                ('ISO 27001', true, NULL),
                ('SOC 2', true, NULL),
                ('GDPR', true, NULL),
                ('HIPAA', false, NULL);
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
