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

describe('Risk Management Integration Tests', () => {
    const adminToken = jwt.sign({ userId: 'admin1', role: 'admin', tenantId: 't1' }, SECRET);
    const userToken = jwt.sign({ userId: 'user1', role: 'user', tenantId: 't1' }, SECRET);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/risks', () => {
        it('should list risks for an admin', async () => {
            // 1. authenticate
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'admin1', role: 'admin', is_active: true, tenant_id: 't1' }]
            });
            // 2. Count
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ total: 1 }] });
            // 3. Data (multiple queries for appetite, scales, and results)
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ risk_id: 'r1', statement: 'Test Risk' }] });

            const response = await request(app)
                .get('/api/v1/risks')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.risks).toBeDefined();
        });
    });

    describe('POST /api/v1/risks', () => {
        it('should allow admin to create a risk', async () => {
            // 1. authenticate
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'admin1', role: 'admin', is_active: true, tenant_id: 't1' }]
            });
            // 2. risk code generation count
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: 0 }] });
            // 3. Insert risk
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ risk_id: 'r-uuid', risk_code: 'RISK-2026-001', statement: 'New Risk', created_at: new Date() }]
            });
            // 4. Audit log change
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            // 5. Audit log action
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/v1/risks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    statement: 'New Risk',
                    category: 'Operational',
                    likelihood_score: 3,
                    impact_score: 4
                });

            expect(response.status).toBe(201);
            expect(response.body.risk_id).toBe('RISK-2026-001');
        });

        it('should deny standard users from creating risks', async () => {
            // authenticate
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'user1', role: 'user', is_active: true, tenant_id: 't1' }]
            });

            const response = await request(app)
                .post('/api/v1/risks')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ statement: 'Hacker Risk' });

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/v1/risks/:riskId/analyze', () => {
        it('should trigger AI analysis for a risk', async () => {
            // authenticate
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{ user_id: 'admin1', role: 'admin', is_active: true, tenant_id: 't1' }]
            });
            // Risk analysis service mocks (we could mock processRiskAnalysis directly if we wanted, 
            // but for integration we let it run and mock its internal query)
            (query as jest.Mock).mockResolvedValue({ rows: [] }); // Catch all for audit/service queries

            const response = await request(app)
                .post('/api/v1/risks/R1/analyze')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
