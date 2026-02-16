import request from 'supertest';
import app from '../server';
import { query } from '../database/connection';
import jwt from 'jsonwebtoken';

// Set test secret
const SECRET = 'test_secret_for_unit_tests';
process.env.JWT_SECRET = SECRET;

jest.mock('../database/connection', () => ({
    query: jest.fn(),
    connectDatabase: jest.fn().mockResolvedValue(null),
    getPool: jest.fn(),
}));

describe('User Roles & RBAC Integration Tests', () => {
    // Generate valid tokens using the same secret the app will see
    const adminToken = jwt.sign({ userId: 'admin1', role: 'admin', tenantId: 't1' }, SECRET);
    const userToken = jwt.sign({ userId: 'user1', role: 'user', tenantId: 't1' }, SECRET);
    const auditorToken = jwt.sign({ userId: 'auditor1', role: 'auditor', tenantId: 't1' }, SECRET);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PATCH /api/v1/users/:targetUserId/role', () => {
        it('should allow admin to change user role to auditor', async () => {
            // authenticate lookup
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'admin1', role: 'admin', is_active: true, tenant_id: 't1' }]
            });
            // update query
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'target1', role: 'auditor', tenant_id: 't1' }]
            });
            // audit log insert
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .patch('/api/v1/users/target1/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'auditor' });

            expect(response.status).toBe(200);
            expect(response.body.role).toBe('auditor');
        });

        it('should deny non-admin users from changing roles', async () => {
            // authenticate lookup
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'user1', role: 'user', is_active: true, tenant_id: 't1' }]
            });

            const response = await request(app)
                .patch('/api/v1/users/target1/role')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: 'admin' });

            expect(response.status).toBe(403);
            expect(response.body.error.message).toContain('Insufficient permissions');
        });

        it('should deny auditors from changing roles', async () => {
            // authenticate lookup
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'auditor1', role: 'auditor', is_active: true, tenant_id: 't1' }]
            });

            const response = await request(app)
                .patch('/api/v1/users/target1/role')
                .set('Authorization', `Bearer ${auditorToken}`)
                .send({ role: 'admin' });

            expect(response.status).toBe(403);
            expect(response.body.error.message).toContain('Insufficient permissions');
        });
    });

    describe('GET /api/v1/users', () => {
        it('should allow admin to view global user list', async () => {
            // 1. authenticate lookup
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'admin1', role: 'admin', is_active: true, tenant_id: 't1' }]
            });
            // 2. Count query
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ total: 1 }] });
            // 3. Data query
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: 'u1', full_name: 'Test user' }] });

            const response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.users).toBeDefined();
            expect(response.body.total).toBe(1);
        });

        it('should deny standard users from viewing user list', async () => {
            // 1. authenticate lookup
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'user1', role: 'user', is_active: true, tenant_id: 't1' }]
            });

            const response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error.message).toContain('Insufficient permissions');
        });
    });
});
