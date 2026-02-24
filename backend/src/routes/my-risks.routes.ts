import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { createTaskCompletionNotification } from '../services/notification.service';

const router = Router();

// All routes require authentication and specific roles
router.use(authenticate);
router.use((req: AuthRequest, _res: Response, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'user' && role !== 'admin') {
        throw new AppError('Access denied. This page is only for standard users and administrators.', 403);
    }
    next();
});

/**
 * GET /api/v1/my-risks/dashboard
 * Get dashboard counts for current user
 */
router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;

    const result = await query(
        `SELECT 
            COUNT(*) FILTER (WHERE status = 'ASSIGNED') as assigned,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
            COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS') AND due_date < NOW()) as overdue
         FROM remediation_plans
         WHERE owner_user_id = $1`,
        [userId]
    );

    res.json(result.rows[0]);
}));

/**
 * GET /api/v1/my-risks
 * Get all risks assigned to current user
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { status, overdue } = req.query;

    let whereConditions = ['rp.owner_user_id = $1'];
    let params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
        whereConditions.push(`rp.status = $${paramIndex}`);
        params.push(String(status).toUpperCase());
        paramIndex++;
    }

    if (overdue === 'true') {
        whereConditions.push(`rp.due_date < NOW()`);
        whereConditions.push(`rp.status NOT IN ('COMPLETED', 'MITIGATED')`);
    }

    const result = await query(
        `SELECT 
            rp.plan_id,
            rp.action_title,
            rp.status,
            rp.priority,
            rp.due_date,
            rp.created_at,
            r.risk_id,
            r.risk_code,
            r.statement as risk_statement,
            r.inherent_risk_score,
            r.category,
            CASE 
                WHEN rp.due_date < NOW() AND rp.status NOT IN ('COMPLETED', 'MITIGATED') THEN true
                ELSE false
            END as is_overdue
         FROM remediation_plans rp
         JOIN risks r ON rp.risk_id = r.risk_id
         WHERE ${whereConditions.join(' AND ')}
         ORDER BY 
            CASE WHEN rp.due_date < NOW() THEN 0 ELSE 1 END,
            rp.due_date ASC NULLS LAST,
            rp.created_at DESC`,
        params
    );

    res.json(result.rows);
}));

/**
 * GET /api/v1/my-risks/:riskId
 * Get detailed risk information for task management
 */
router.get('/:riskId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { riskId } = req.params;

    // Support both risk_id and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'r.risk_id' : 'r.risk_code';

    const result = await query(
        `SELECT 
            r.*,
            rp.plan_id,
            rp.action_title,
            rp.description,
            rp.action_plan,
            rp.notes,
            rp.attachments,
            rp.status,
            rp.priority,
            rp.due_date,
            rp.created_at as task_created_at,
            rp.updated_at as task_updated_at
         FROM risks r
         JOIN remediation_plans rp ON r.risk_id = rp.risk_id
         WHERE ${idColumn} = $1 AND rp.owner_user_id = $2`,
        [riskId, userId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Risk not found or not assigned to you', 404);
    }

    const risk = result.rows[0];

    // Get AI suggestions if available
    const aiSuggestions = risk.analysis?.remediation_suggestions || [];

    // Get task files
    const filesResult = await query(
        'SELECT * FROM task_files WHERE task_id = $1 ORDER BY uploaded_at DESC',
        [risk.plan_id]
    );

    res.json({
        ...risk,
        ai_suggestions: aiSuggestions,
        files: filesResult.rows
    });
}));

/**
 * PUT /api/v1/my-risks/:riskId/task
 * Update task details (action plan, notes, status)
 */
router.put('/:riskId/task', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;
    const { riskId } = req.params;
    const { action_plan, notes, status } = req.body;

    // Get the task
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'r.risk_id' : 'r.risk_code';

    const taskResult = await query(
        `SELECT rp.*, r.risk_code, r.statement, r.owner_user_id as risk_owner
         FROM remediation_plans rp
         JOIN risks r ON rp.risk_id = r.risk_id
         WHERE ${idColumn} = $1 AND rp.owner_user_id = $2`,
        [riskId, userId]
    );

    if (taskResult.rows.length === 0) {
        throw new AppError('Task not found or not assigned to you', 404);
    }

    const task = taskResult.rows[0];
    const oldStatus = task.status;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (action_plan !== undefined) {
        updates.push(`action_plan = $${paramIndex++}`);
        params.push(action_plan);
    }

    if (notes !== undefined) {
        // Append new note to notes array
        updates.push(`notes = notes || $${paramIndex++}::jsonb`);
        params.push(JSON.stringify([{
            text: notes,
            created_at: new Date().toISOString(),
            created_by: userId
        }]));
    }

    if (status !== undefined) {
        const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'MITIGATED', 'COMPLETED', 'BLOCKED'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
    }

    if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
    }

    params.push(task.plan_id);

    const result = await query(
        `UPDATE remediation_plans 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE plan_id = $${paramIndex}
         RETURNING *`,
        params
    );

    const updatedTask = result.rows[0];

    // If status changed to COMPLETED, notify risk owner/manager
    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        try {
            await createTaskCompletionNotification(
                tenantId,
                task.risk_owner,
                task.plan_id,
                task.action_title,
                task.statement,
                task.risk_id,
                task.risk_code,
                userId
            );
            logger.info(`Created completion notification for risk owner ${task.risk_owner}`);
        } catch (error) {
            logger.error('Failed to create completion notification:', error);
        }
    }

    res.json(updatedTask);
}));

/**
 * POST /api/v1/my-risks/:riskId/upload
 * Upload file attachment for task
 */
router.post('/:riskId/upload', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;
    const { riskId } = req.params;
    const { file_name, file_path, file_size, mime_type } = req.body;

    if (!file_name || !file_path) {
        throw new AppError('file_name and file_path are required', 400);
    }

    // Get the task
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'r.risk_id' : 'r.risk_code';

    const taskResult = await query(
        `SELECT rp.plan_id
         FROM remediation_plans rp
         JOIN risks r ON rp.risk_id = r.risk_id
         WHERE ${idColumn} = $1 AND rp.owner_user_id = $2`,
        [riskId, userId]
    );

    if (taskResult.rows.length === 0) {
        throw new AppError('Task not found or not assigned to you', 404);
    }

    const task = taskResult.rows[0];

    // Insert file record
    const result = await query(
        `INSERT INTO task_files (task_id, file_name, file_path, file_size, mime_type, uploaded_by, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [task.plan_id, file_name, file_path, file_size, mime_type, userId, tenantId]
    );

    res.status(201).json(result.rows[0]);
}));

export default router;
