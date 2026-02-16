import request from 'supertest';
import app from '../server';
import { query } from '../database/connection';
import bcrypt from 'bcrypt';

// Mock the database query function
jest.mock('../database/connection', () => ({
    query: jest.fn(),
    connectDatabase: jest.fn().mockResolvedValue(null),
    getPool: jest.fn(),
}));

describe('Auth Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            // Sequence of queries in register:
            // 1. Subdomain check
            // 2. BEGIN
            // 3. Insert tenant
            // 4. Insert user
            // 5. COMMIT

            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] }) // 1. Subdomain check
                .mockResolvedValueOnce({ rows: [] }) // 2. BEGIN
                .mockResolvedValueOnce({ rows: [{ tenant_id: 't1', org_name: 'Test Org', subdomain: 'test', subscription_tier: 'growth' }] }) // 3. Tenant creation
                .mockResolvedValueOnce({ rows: [{ user_id: 'u1', email: 'jd@gmail.com', full_name: 'Test user', role: 'admin' }] }) // 4. User creation
                .mockResolvedValueOnce({ rows: [] }); // 5. COMMIT

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    admin_email: 'jd@gmail.com',
                    password: 'password123',
                    admin_name: 'Test user',
                    org_name: 'Test Org',
                    subdomain: 'test'
                });

            expect(response.status).toBe(201);
            expect(response.body.user).toBeDefined();
            expect(response.body.access_token).toBeDefined();
        });

        it('should fail if subdomain is already taken', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ tenant_id: 't1' }] });

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    admin_email: 'new@example.com',
                    password: 'password123',
                    admin_name: 'New user',
                    org_name: 'New Org',
                    subdomain: 'existing'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('Subdomain already exists');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            (query as jest.Mock)
                .mockResolvedValueOnce({
                    rows: [{
                        user_id: 'u1',
                        tenant_id: 't1',
                        email: 'test@example.com',
                        password_hash: passwordHash,
                        is_active: true,
                        role: 'admin',
                        org_name: 'Test Org',
                        subdomain: 'test',
                        tenant_status: 'active'
                    }]
                }) // Login check
                .mockResolvedValueOnce({ rows: [] }); // Update last login

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.access_token).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            const passwordHash = await bcrypt.hash('correct_password', 10);
            (query as jest.Mock).mockResolvedValueOnce({
                rows: [{
                    user_id: 'u1',
                    email: 'test@example.com',
                    password_hash: passwordHash,
                    is_active: true,
                    tenant_status: 'active'
                }]
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrong_password'
                });

            expect(response.status).toBe(401);
            expect(response.body.error.message).toContain('Invalid credentials');
        });
    });
});
