import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        // Create departments table
        await query(`
            CREATE TABLE IF NOT EXISTS departments (
                department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                manager_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, name)
            );
        `);
        console.log('Created departments table');

        // Add department_id to users table - DO NOT ADD REFERENCES CONSTRAINT YET IF CIRCULAR DEPENDENCY OR COMPLEXITY
        // Actually, users depends on tenants, departments depends on tenants. 
        // users.department_id -> departments.department_id.
        // departments.manager_user_id -> users.user_id.
        // This is a circular dependency. Circular FKs are annoying to insert.
        // But for schema creation it's fine if we do it in two steps.
        // However, if I create table departments referencing users, and users referencing departments...
        // I should just add the column to users first without constraint, or be careful.
        // Actually, `manager_user_id UUID REFERENCES users(user_id)` is fine as users already exists.
        // Then altering users to reference departments is also fine.

        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL;
        `);
        console.log('Added department_id to users table');

        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);`);
        console.log('Created indexes');

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        await closeDatabase();
    }
};

run();
