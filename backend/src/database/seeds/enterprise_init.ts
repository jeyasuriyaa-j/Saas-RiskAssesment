

import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const DEFAULT_DEPARTMENTS = ['IT', 'Finance', 'Legal', 'Operations', 'HR', 'Compliance'];

async function seedEnterprise() {
    console.log('Seeding Enterprise Data...');

    try {
        // 1. Get Tenant ID (assuming single tenant for now or first one)
        const tenantRes = await pool.query('SELECT tenant_id FROM tenants LIMIT 1');
        if (tenantRes.rows.length === 0) {
            console.log('No tenant found. Generating default tenant...');
            // Should create tenant logic here if needed, but assuming one exists from previous seeds
            return;
        }
        const tenantId = tenantRes.rows[0].tenant_id;

        // 2. Create Departments
        console.log('Creating Departments...');
        const deptMap = new Map<string, string>(); // Name -> UUID

        for (const deptName of DEFAULT_DEPARTMENTS) {
            const res = await pool.query(
                `INSERT INTO departments (tenant_id, name) 
             VALUES ($1, $2) 
             ON CONFLICT (tenant_id, name) DO UPDATE SET updated_at = NOW() 
             RETURNING department_id`,
                [tenantId, deptName]
            );
            deptMap.set(deptName, res.rows[0].department_id);
        }

        // 3. Assign Users to Departments (Round Robin or Default to IT)
        console.log('Assigning Users to Departments...');
        const usersRes = await pool.query('SELECT user_id, email, role FROM users WHERE department_id IS NULL');

        // Simple logic: Admin -> IT, Risk Manager -> Legal/Compliance, Users -> Spread
        for (const user of usersRes.rows) {
            let targetDept = 'IT';
            if (user.role === 'risk_manager') targetDept = 'Legal';
            if (user.role === 'user') targetDept = 'Operations';

            const deptId = deptMap.get(targetDept);
            await pool.query('UPDATE users SET department_id = $1 WHERE user_id = $2', [deptId, user.user_id]);
        }

        // 4. Update Risks (Inherit from Owner)
        console.log('Updating Risks with Departments...');
        await pool.query(`
        UPDATE risks 
        SET department_id = u.department_id 
        FROM users u 
        WHERE risks.owner_user_id = u.user_id 
        AND risks.department_id IS NULL
    `);

        // 5. Create Initial Assignments (Owner is Assignee)
        console.log('Creating Initial Assignments...');
        // Only for risks that don't have assignments yet
        const risksWithoutAssignments = await pool.query(`
        SELECT r.risk_id, r.owner_user_id, r.tenant_id 
        FROM risks r 
        LEFT JOIN risk_assignments ra ON r.risk_id = ra.risk_id 
        WHERE ra.assignment_id IS NULL
    `);

        for (const risk of risksWithoutAssignments.rows) {
            await pool.query(`
            INSERT INTO risk_assignments (risk_id, user_id, status)
            VALUES ($1, $2, 'ACCEPTED')
        `, [risk.risk_id, risk.owner_user_id]);

            // Update array cache
            await pool.query(`
            UPDATE risks 
            SET current_assignee_ids = ARRAY[$2]::uuid[]
            WHERE risk_id = $1
        `, [risk.risk_id, risk.owner_user_id]);
        }

        console.log('Enterprise Seeding Completed.');

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seedEnterprise();
