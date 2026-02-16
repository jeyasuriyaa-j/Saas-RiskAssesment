import { Pool } from 'pg';

export class DepartmentService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async getDepartments(tenantId: string) {
        const result = await this.pool.query(
            'SELECT * FROM departments WHERE tenant_id = $1 ORDER BY name ASC',
            [tenantId]
        );
        return result.rows;
    }

    async getDepartmentById(deptId: string) {
        const result = await this.pool.query(
            'SELECT * FROM departments WHERE department_id = $1',
            [deptId]
        );
        return result.rows[0];
    }

    async createDepartment(tenantId: string, name: string, managerId?: string) {
        const result = await this.pool.query(
            `INSERT INTO departments (tenant_id, name, manager_user_id) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [tenantId, name, managerId]
        );
        return result.rows[0];
    }

    async assignUserToDepartment(userId: string, deptId: string) {
        await this.pool.query(
            'UPDATE users SET department_id = $1 WHERE user_id = $2',
            [deptId, userId]
        );
    }
}
