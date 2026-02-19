import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all users for the current tenant
 * GET /api/v1/users
 */
router.get('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, role } = req.user!;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const isAdmin = role === 'admin';
    const isRiskManager = role === 'risk_manager';

    // Base query parts
    let whereClause = 'WHERE u.tenant_id = $1';
    let queryParams: any[] = [tenantId];

    // If Admin or Risk Manager, remove tenant restriction to see all users
    if (isAdmin || isRiskManager) {
        whereClause = '';
        queryParams = [];
    }

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Data query
    const dataQuery = `
        SELECT u.user_id, u.email, u.full_name, u.role, u.is_active, u.last_login, u.created_at,
               t.org_name as organization
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await query(
        dataQuery,
        [...queryParams, Number(limit), offset]
    );

    res.json({
        page: Number(page),
        limit: Number(limit),
        total,
        users: result.rows
    });
}));

/**
 * Get users by department (for task assignment)
 * GET /api/v1/users/by-department?department=IT
 */
router.get('/by-department', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { department } = req.query;

    if (!department) {
        throw new AppError('Department parameter is required', 400);
    }

    const result = await query(
        `SELECT user_id, full_name, email, department, role 
         FROM users 
         WHERE tenant_id = $1 AND department = $2 AND is_active = true
         ORDER BY full_name ASC`,
        [tenantId, department]
    );

    res.json(result.rows);
}));

/**
 * Get all users for task assignment (with department info)
 * GET /api/v1/users/assignable
 */
router.get('/assignable', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, role } = req.user!;
    const { department } = req.query;

    const isAdmin = role === 'admin';
    const isRiskManager = role === 'risk_manager';

    const params: any[] = [];
    const conditions: string[] = ['is_active = true', "role != 'admin'"];

    // Only filter by tenant if NOT admin/manager
    if (!isAdmin && !isRiskManager) {
        conditions.push(`tenant_id = $${params.length + 1}`);
        params.push(tenantId);
    }

    if (department) {
        conditions.push(`department = $${params.length + 1}`);
        params.push(department);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
        `SELECT user_id, full_name, email, department, role 
         FROM users 
         ${whereClause}
         ORDER BY department ASC, full_name ASC`,
        params
    );

    res.json(result.rows);
}));

/**
 * Invite a new user
 * POST /api/v1/users/invite
 */
router.post('/invite', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { email, full_name, role, department } = req.body;

    if (!email || !full_name || !role) {
        throw new AppError('Email, name, and role are required', 400);
    }

    // Check if user exists
    const existing = await query(
        'SELECT user_id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
        throw new AppError('User with this email already exists', 400);
    }

    // Generate temporary password (random 12 chars)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, department, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
         RETURNING user_id, email, full_name, role, department, is_active`,
        [tenantId, email.toLowerCase(), passwordHash, full_name, role, department]
    );

    const newUser = result.rows[0];

    // Log action
    logger.info(`User invited: ${newUser.email} by admin ${userId}`);

    // Add to Audit Log
    await query(
        `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
         VALUES ($1, 'USER', $2, 'CREATE', $3, (SELECT full_name FROM users WHERE user_id = $3), $4)`,
        [tenantId, newUser.user_id, userId, JSON.stringify({ email: newUser.email, role: newUser.role })]
    );

    // In a real app, we would send an email here.
    // For MVP, we return the temp password to display to the admin.
    res.status(201).json({
        user: newUser,
        temporary_password: tempPassword,
        message: 'User created successfully. Please share the temporary password.'
    });
}));

/**
 * Update user role
 * PATCH /api/v1/users/:userId/role
 */
router.patch('/:targetUserId/role', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { targetUserId } = req.params;
    const { role } = req.body;

    if (!['admin', 'risk_manager', 'user', 'auditor', 'viewer'].includes(role)) {
        throw new AppError('Invalid role', 400);
    }

    // Prevent changing own role
    if (targetUserId === userId) {
        throw new AppError('Cannot change your own role', 400);
    }

    // Admin can update any user (cross-tenant)
    const result = await query(
        `UPDATE users 
         SET role = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING user_id, role, tenant_id`,
        [role, targetUserId]
    );

    if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    const updatedUser = result.rows[0];
    logger.info(`User ${targetUserId} role updated to ${role} by admin ${userId}`);

    // Add to Audit Log (use the target user's tenant)
    await query(
        `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
         VALUES ($1, 'USER', $2, 'UPDATE', $3, (SELECT full_name FROM users WHERE user_id = $3), $4)`,
        [updatedUser.tenant_id, targetUserId, userId, JSON.stringify({ role: { new: role } })]
    );

    res.json({ user_id: updatedUser.user_id, role: updatedUser.role });
}));

/**
 * Toggle user status (Enable/Disable)
 * PATCH /api/v1/users/:userId/status
 */
router.patch('/:targetUserId/status', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { targetUserId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        throw new AppError('is_active must be a boolean', 400);
    }

    // Prevent disabling yourself
    if (targetUserId === userId) {
        throw new AppError('Cannot disable your own account', 400);
    }

    // Admin can update any user (cross-tenant)
    const result = await query(
        `UPDATE users 
         SET is_active = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING user_id, is_active, tenant_id`,
        [is_active, targetUserId]
    );

    if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    const updatedUser = result.rows[0];
    logger.info(`User ${targetUserId} status changed to ${is_active} by admin ${userId}`);

    // Add to Audit Log
    await query(
        `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
         VALUES ($1, 'USER', $2, 'UPDATE', $3, (SELECT full_name FROM users WHERE user_id = $3), $4)`,
        [updatedUser.tenant_id, targetUserId, userId, JSON.stringify({ is_active: { new: is_active } })]
    );

    res.json({ user_id: updatedUser.user_id, is_active: updatedUser.is_active });
}));

/**
 * Delete a user
 * DELETE /api/v1/users/:userId
 */
router.delete('/:targetUserId', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { targetUserId } = req.params;

    // Prevent deleting yourself
    if (targetUserId === userId) {
        throw new AppError('Cannot delete your own account', 400);
    }

    // Get user info before delete for audit
    const userInfo = await query(
        'SELECT email, full_name, tenant_id FROM users WHERE user_id = $1',
        [targetUserId]
    );

    if (userInfo.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    const user = userInfo.rows[0];

    // Delete the user
    await query('DELETE FROM users WHERE user_id = $1', [targetUserId]);

    logger.info(`User ${user.email} deleted by admin ${userId}`);

    // Add to Audit Log
    await query(
        `INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor_user_id, actor_name, changes)
         VALUES ($1, 'USER', $2, 'DELETE', $3, (SELECT full_name FROM users WHERE user_id = $3), $4)`,
        [user.tenant_id, targetUserId, userId, JSON.stringify({ email: user.email, full_name: user.full_name })]
    );

    res.json({ message: 'User deleted successfully' });
}));

export default router;
