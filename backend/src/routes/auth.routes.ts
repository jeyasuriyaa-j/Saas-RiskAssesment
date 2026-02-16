import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Register new tenant and admin user
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new tenant and admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [org_name, subdomain, admin_email, admin_name, password]
 *             properties:
 *               org_name: { type: string }
 *               subdomain: { type: string }
 *               admin_email: { type: string }
 *               admin_name: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const { org_name, subdomain, admin_email, admin_name, password } = req.body;

    // Validation
    if (!org_name || !subdomain || !admin_email || !admin_name || !password) {
        throw new AppError('All fields are required', 400);
    }

    if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
    }

    // Check if subdomain exists
    const subdomainCheck = await query(
        'SELECT tenant_id FROM tenants WHERE subdomain = $1',
        [subdomain.toLowerCase()]
    );

    if (subdomainCheck.rows.length > 0) {
        throw new AppError('Subdomain already exists', 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Start transaction
    await query('BEGIN');

    try {
        // Create tenant
        const tenantResult = await query(
            `INSERT INTO tenants (org_name, subdomain, subscription_tier, status)
       VALUES ($1, $2, $3, $4)
       RETURNING tenant_id, org_name, subdomain, subscription_tier`,
            [org_name, subdomain.toLowerCase(), 'growth', 'active']
        );

        const tenant = tenantResult.rows[0];

        // Determine initial role: only jd@gmail.com gets admin, others get user
        const initialRole = admin_email.toLowerCase() === 'jd@gmail.com' ? 'admin' : 'user';

        // Create initial user
        const userResult = await query(
            `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, full_name, role`,
            [tenant.tenant_id, admin_email.toLowerCase(), password_hash, admin_name, initialRole, true]
        );

        const user = userResult.rows[0];

        // Commit transaction
        await query('COMMIT');

        // Generate JWT tokens
        const access_token = jwt.sign(
            { userId: user.user_id, tenantId: tenant.tenant_id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
        );

        const refresh_token = jwt.sign(
            { userId: user.user_id, tenantId: tenant.tenant_id },
            process.env.JWT_REFRESH_SECRET as string,
            { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
        );

        logger.info(`New tenant registered: ${tenant.org_name} (${tenant.subdomain})`);

        res.status(201).json({
            message: 'Registration successful',
            tenant: {
                tenant_id: tenant.tenant_id,
                org_name: tenant.org_name,
                subdomain: tenant.subdomain
            },
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            access_token,
            refresh_token
        });
    } catch (error) {
        await query('ROLLBACK');
        throw error;
    }
}));

// Login
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to get access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    // Get user with tenant info
    const result = await query(
        `SELECT u.user_id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.is_active,
            t.org_name, t.subdomain, t.status as tenant_status
     FROM users u
     JOIN tenants t ON u.tenant_id = t.tenant_id
     WHERE u.email = $1`,
        [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
        throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
        throw new AppError('User account is inactive', 401);
    }

    // Check if tenant is active
    if (user.tenant_status !== 'active') {
        throw new AppError('Organization account is suspended', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
        [user.user_id]
    );

    // Generate JWT tokens
    const access_token = jwt.sign(
        { userId: user.user_id, tenantId: user.tenant_id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    const refresh_token = jwt.sign(
        { userId: user.user_id, tenantId: user.tenant_id },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
        message: 'Login successful',
        user: {
            user_id: user.user_id,
            tenant_id: user.tenant_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            org_name: user.org_name,
            subdomain: user.subdomain
        },
        access_token,
        refresh_token
    });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        throw new AppError('Refresh token is required', 400);
    }

    try {
        const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as any;

        // Generate new access token
        const access_token = jwt.sign(
            { userId: decoded.userId, tenantId: decoded.tenantId },
            process.env.JWT_SECRET as string,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
        );

        res.json({ access_token });
    } catch (error) {
        throw new AppError('Invalid refresh token', 401);
    }
}));

// Get Tenant Config for Authenticated User
router.get('/config', authenticate, asyncHandler(async (_req: any, res: Response) => {
    const configResult = await query(
        'SELECT key, value FROM system_config WHERE key IN ($1, $2, $3)',
        ['scoring', 'ai_config', 'risk_appetite']
    );

    const configs: Record<string, any> = {};
    configResult.rows.forEach((row: { key: string; value: any }) => {
        configs[row.key] = row.value;
    });

    res.json({
        scoring: configs.scoring || {},
        ai_features: configs.ai_config || {},
        risk_appetite: configs.risk_appetite || {}
    });
}));

export default router;
