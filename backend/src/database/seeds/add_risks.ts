
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'jeyasuriyaajeyakumar',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'risk_assessment_db',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function addRisks() {
    try {
        console.log('Adding sample risks...');

        // 1. Get Tenant and User
        const tenantRes = await pool.query('SELECT tenant_id FROM tenants LIMIT 1');
        const userRes = await pool.query('SELECT user_id FROM users LIMIT 1');

        if (tenantRes.rows.length === 0 || userRes.rows.length === 0) {
            console.error('No tenant or user found. Run init seed first.');
            return;
        }

        const tenantId = tenantRes.rows[0].tenant_id;
        const userId = userRes.rows[0].user_id;

        console.log(`Using Tenant: ${tenantId}, User: ${userId}`);

        // 2. Insert Risks
        const risks = [
            {
                statement: 'Cloud Storage Misconfiguration',
                description: 'Sensitive data in S3 buckets might be publicly accessible due to misconfiguration.',
                category: 'Cyber Security',
                likelihood: 4,
                impact: 5,
                status: 'ACTIVE',
                priority: 'critical'
            },
            {
                statement: 'Vendor Supply Chain Failure',
                description: 'Key component supplier might go bankrupt affecting production timeline.',
                category: 'Operational',
                likelihood: 3,
                impact: 5,
                status: 'ACTIVE',
                priority: 'high'
            },
            {
                statement: 'Key Employee Churn',
                description: 'Loss of senior developers could delay platform release.',
                category: 'HR',
                likelihood: 3,
                impact: 4,
                status: 'DRAFT',
                priority: 'medium'
            }
        ];

        for (const risk of risks) {
            await pool.query(`
                INSERT INTO risks (
                    tenant_id, 
                    statement, 
                    description, 
                    category, 
                    owner_user_id, 
                    status, 
                    priority, 
                    likelihood_score, 
                    impact_score,
                    identified_date
                ) VALUES ($1, $2, $3, $4, $5, $6::risk_status, $7, $8, $9, NOW())
            `, [
                tenantId,
                risk.statement,
                risk.description,
                risk.category,
                userId,
                risk.status,
                risk.priority,
                risk.likelihood,
                risk.impact
            ]);
        }

        console.log(`Successfully added ${risks.length} sample risks.`);

    } catch (err) {
        console.error('Failed to add risks:', err);
    } finally {
        await pool.end();
    }
}

addRisks();
