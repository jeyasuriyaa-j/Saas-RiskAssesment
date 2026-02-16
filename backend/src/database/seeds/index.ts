
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
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

async function seed() {
    try {
        console.log('Seeding database...');

        // 1. Create Tenant
        const tenantRes = await pool.query(`
            INSERT INTO tenants (org_name, subdomain, subscription_tier)
            VALUES ('RiskGuard Inc', 'riskguard', 'enterprise')
            RETURNING tenant_id
        `);
        const tenantId = tenantRes.rows[0].tenant_id;
        console.log('Tenant created:', tenantId);

        // 2. Create User
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        await pool.query(`
            INSERT INTO users (tenant_id, email, password_hash, full_name, role)
            VALUES ($1, 'jd@gmail.com', $2, 'John Doe', 'admin')
        `, [tenantId, hash]);

        console.log('User created: jd@gmail.com / password123');

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

seed();
