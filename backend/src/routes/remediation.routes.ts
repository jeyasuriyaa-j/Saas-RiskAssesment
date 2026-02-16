import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest, USER_EDITABLE_TASK_FIELDS } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import { createTaskAssignmentNotification } from '../services/notification.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get remediation plans for a specific risk
 * GET /api/v1/remediation/risk/:riskId
 */
router.get('/risk/:riskId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId: paramRiskId } = req.params;

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = paramRiskId;

    if (!uuidRegex.test(paramRiskId)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [paramRiskId, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            // If risk not found by code, return empty array instead of 404 to be safe 
            // or stick to API pattern. Returns empty array for list endpoint is safer for UI.
            res.json([]);
            return;
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    }

    const result = await query(
        `SELECT rp.*, u.full_name as owner_name 
         FROM remediation_plans rp
         LEFT JOIN users u ON rp.owner_user_id = u.user_id
         WHERE rp.risk_id = $1 AND rp.tenant_id = $2
         ORDER BY rp.created_at DESC`,
        [resolvedRiskId, tenantId]
    );

    res.json(result.rows);
}));

/**
 * Get all assigned tasks for a specific risk (for Risk Managers)
 * GET /api/v1/remediation/risk/:riskId/assigned-tasks
 */
router.get('/risk/:riskId/assigned-tasks', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId: paramRiskId } = req.params;

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = paramRiskId;

    if (!uuidRegex.test(paramRiskId)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [paramRiskId, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            res.json([]);
            return;
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    }

    // Fetch all remediation plans with assignee details
    const result = await query(
        `SELECT 
            rp.plan_id,
            rp.risk_id,
            rp.action_title,
            rp.description,
            rp.status,
            rp.priority,
            rp.due_date,
            rp.action_plan,
            rp.notes,
            rp.attachments,
            rp.created_at,
            rp.updated_at,
            rp.owner_user_id,
            json_build_object(
                'user_id', u.user_id,
                'full_name', u.full_name,
                'email', u.email
            ) as assignee
         FROM remediation_plans rp
         LEFT JOIN users u ON u.user_id = rp.owner_user_id
         WHERE rp.risk_id = $1 AND rp.tenant_id = $2
         ORDER BY rp.created_at DESC`,
        [resolvedRiskId, tenantId]
    );

    res.json(result.rows);
}));

/**
 * Get tasks assigned to current user
 * GET /api/v1/remediation/my-tasks
 */
router.get('/my-tasks', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, tenantId } = req.user!;

    const result = await query(
        `SELECT rp.*, r.statement as risk_statement, r.risk_code, u.full_name as owner_name
         FROM remediation_plans rp
         JOIN risks r ON rp.risk_id = r.risk_id
         LEFT JOIN users u ON rp.owner_user_id = u.user_id
         WHERE rp.owner_user_id = $1 AND rp.tenant_id = $2
         ORDER BY rp.due_date ASC NULLS LAST, rp.created_at DESC`,
        [userId, tenantId]
    );

    res.json(result.rows);
}));

/**
 * Assign task to a user (Risk Manager assigns to team member)
 * POST /api/v1/remediation/assign
 */
router.post('/assign', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info(`Remediation assignment request: ${JSON.stringify(req.body)}`);
    const { tenantId, userId: assignerUserId } = req.user!;
    const {
        risk_id,
        assignee_user_id,
        action_title,
        description,
        due_date,
        priority
    } = req.body;

    if (!risk_id || !assignee_user_id || !action_title) {
        throw new AppError('risk_id, assignee_user_id, and action_title are required', 400);
    }

    const [isAdmin, isRiskManager] = [req.user!.role === 'admin', req.user!.role === 'risk_manager'];

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = risk_id;
    let riskTenantId = tenantId;

    if (!uuidRegex.test(risk_id)) {
        let riskQuery = 'SELECT risk_id, tenant_id FROM risks WHERE risk_code = $1';
        let riskParams = [risk_id];

        if (!isAdmin && !isRiskManager) {
            riskQuery += ' AND tenant_id = $2';
            riskParams.push(tenantId as any);
        }

        const riskLookup = await query(riskQuery, riskParams);
        if (riskLookup.rows.length === 0) {
            throw new AppError('Risk not found or access denied', 404);
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
        riskTenantId = riskLookup.rows[0].tenant_id;
    } else {
        const riskLookup = await query('SELECT tenant_id FROM risks WHERE risk_id = $1', [risk_id]);
        if (riskLookup.rows.length > 0) {
            riskTenantId = riskLookup.rows[0].tenant_id;
        }
    }

    // Verify assignee exists
    let assigneeQuery = 'SELECT user_id, full_name, email, role FROM users WHERE user_id = $1 AND is_active = true';
    let assigneeParams = [assignee_user_id];

    // Only strictly check same tenant if not admin/manager
    if (!isAdmin && !isRiskManager) {
        assigneeQuery += ' AND tenant_id = $2';
        assigneeParams.push(tenantId as any);
    }

    const assigneeCheck = await query(assigneeQuery, assigneeParams);

    if (assigneeCheck.rows.length === 0) {
        throw new AppError('Assignee not found or inactive', 404);
    }

    if (assigneeCheck.rows[0].role === 'admin') {
        throw new AppError('Tasks cannot be assigned to admins', 400);
    }

    const assignee = assigneeCheck.rows[0];

    // Create the task
    const result = await query(
        `INSERT INTO remediation_plans (
            tenant_id, risk_id, action_title, description, 
            owner_user_id, due_date, status, priority, ai_suggested
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ASSIGNED', $7, false)
        RETURNING *`,
        [
            riskTenantId,
            resolvedRiskId,
            action_title,
            description || null,
            assignee_user_id,
            due_date || null,
            priority || 'MEDIUM'
        ]
    );

    const newTask = result.rows[0];

    // Update risk's current_assignee_ids to include this assignee
    await query(
        `UPDATE risks 
         SET current_assignee_ids = CASE 
             WHEN current_assignee_ids IS NULL THEN ARRAY[$1]::uuid[]
             WHEN NOT ($1 = ANY(current_assignee_ids)) THEN array_append(current_assignee_ids, $1)
             ELSE current_assignee_ids
         END
         WHERE risk_id = $2`,
        [assignee_user_id, resolvedRiskId]
    );

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'TASK_ASSIGNMENT',
        entity_id: newTask.plan_id,
        action: 'CREATE',
        actor_user_id: assignerUserId,
        changes: {
            risk_id: resolvedRiskId,
            assigned_to: { user_id: assignee_user_id, name: assignee.full_name },
            action_title,
            priority
        }
    });

    // Log to risk history (for the per-risk changelog)
    await auditService.logChange({
        risk_id: resolvedRiskId,
        changed_by: assignerUserId,
        change_type: 'task_assigned',
        field_name: 'Remediation Task',
        new_value: `Assigned task "${action_title}" to ${assignee.full_name}`,
        change_reason: 'Manual task assignment'
    });

    logger.info(`Task assigned: ${newTask.plan_id} to user ${assignee.full_name} by ${assignerUserId}`);

    // Get risk details for email
    const riskDetails = await query(
        'SELECT risk_code, statement FROM risks WHERE risk_id = $1',
        [resolvedRiskId]
    );
    const riskInfo = riskDetails.rows[0];

    // Get assigner name
    const assignerDetails = await query(
        'SELECT full_name FROM users WHERE user_id = $1',
        [assignerUserId]
    );
    const assignerName = assignerDetails.rows[0]?.full_name;

    // Send email notification (async - don't block response)
    emailService.sendTaskAssignment({
        assigneeEmail: assignee.email,
        assigneeName: assignee.full_name,
        taskTitle: action_title,
        taskDescription: description,
        riskCode: riskInfo?.risk_code,
        riskStatement: riskInfo?.statement,
        dueDate: due_date,
        priority: priority || 'MEDIUM',
        assignerName
    }).catch((err: any) => logger.error('Email send failed:', err));

    // Get assignee's tenant_id for notification
    const assigneeTenantResult = await query('SELECT tenant_id FROM users WHERE user_id = $1', [assignee_user_id]);
    const assigneeTenantId = assigneeTenantResult.rows[0]?.tenant_id || riskTenantId;

    // Create in-app notification (use assignee's tenant so they can see it)
    createTaskAssignmentNotification(
        assigneeTenantId,
        assignee_user_id,
        newTask.plan_id,
        action_title,
        riskInfo?.statement || 'Risk',
        resolvedRiskId,
        riskInfo?.risk_code
    ).catch((err: any) => logger.error('Notification creation failed:', err));

    res.status(201).json({
        ...newTask,
        assignee_name: assignee.full_name,
        assignee_email: assignee.email
    });
}));

/**
 * Create a new remediation plan/task (Admin and Risk Manager only)
 * POST /api/v1/remediation
 */
router.post('/', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const {
        risk_id,
        action_title,
        description,
        owner_user_id,
        due_date,
        ai_suggested
    } = req.body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = risk_id;

    if (!uuidRegex.test(risk_id)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [risk_id, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    }

    const result = await query(
        `INSERT INTO remediation_plans (
            tenant_id, risk_id, action_title, description, 
            owner_user_id, due_date, ai_suggested
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            tenantId,
            resolvedRiskId,
            action_title,
            description || null,
            owner_user_id || userId,
            due_date || null,
            ai_suggested || false
        ]
    );

    const newPlan = result.rows[0];
    logger.info(`Remediation plan created: ${newPlan.plan_id} for risk ${risk_id}`);

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'REMEDIATION',
        entity_id: newPlan.plan_id,
        action: 'CREATE',
        actor_user_id: userId,
        changes: newPlan
    });

    // Log to risk history
    await auditService.logChange({
        risk_id: resolvedRiskId,
        changed_by: userId,
        change_type: 'task_created',
        field_name: 'Remediation Task',
        new_value: `Created task "${action_title}"`,
        change_reason: ai_suggested ? 'AI-suggested remediation task' : 'Manual remediation task creation'
    });

    res.status(201).json(newPlan);
}));

/**
 * Update remediation plan/task status (Role-based ownership check)
 * PUT /api/v1/remediation/:planId
 */
router.put('/:planId', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId, role } = req.user!;
    const { planId } = req.params;

    // First, fetch the task to check ownership
    const taskResult = await query(
        'SELECT * FROM remediation_plans WHERE plan_id = $1 AND tenant_id = $2',
        [planId, tenantId]
    );

    if (taskResult.rows.length === 0) {
        throw new AppError('Remediation plan not found', 404);
    }

    const task = taskResult.rows[0];

    // Role-based access: Users can only update their own tasks
    if (role === 'user' && task.owner_user_id !== userId) {
        throw new AppError('You can only update tasks assigned to you', 403);
    }

    // Role-based field restrictions: Users can only update limited fields
    if (role === 'user') {
        const requestedFields = Object.keys(req.body);
        const forbiddenFields = requestedFields.filter(f => !USER_EDITABLE_TASK_FIELDS.includes(f));

        if (forbiddenFields.length > 0) {
            throw new AppError(`Users cannot modify: ${forbiddenFields.join(', ')}. Allowed fields: ${USER_EDITABLE_TASK_FIELDS.join(', ')}`, 403);
        }
    }

    const { status, description, due_date, owner_user_id, notes, completion_notes } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
    }
    if (due_date !== undefined) {
        updates.push(`due_date = $${paramIndex++}`);
        params.push(due_date);
    }
    if (owner_user_id !== undefined) {
        updates.push(`owner_user_id = $${paramIndex++}`);
        params.push(owner_user_id);
    }
    if (notes !== undefined) {
        // Store in JSONB custom_fields or a notes column
        updates.push(`description = COALESCE(description, '') || ' [User Note: ' || $${paramIndex++} || ']'`);
        params.push(notes);
    }
    if (completion_notes !== undefined) {
        updates.push(`description = COALESCE(description, '') || ' [Completion: ' || $${paramIndex++} || ']'`);
        params.push(completion_notes);
    }

    if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
    }

    params.push(planId, tenantId);

    const result = await query(
        `UPDATE remediation_plans 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE plan_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        params
    );

    const updatedPlan = result.rows[0];

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'REMEDIATION',
        entity_id: planId,
        action: 'UPDATE',
        actor_user_id: userId,
        changes: { status, description, due_date, owner_user_id, notes, completion_notes }
    });

    // Log to risk history
    await auditService.logChange({
        risk_id: task.risk_id,
        changed_by: userId,
        change_type: status ? 'status_changed' : 'task_updated',
        field_name: 'Remediation Task Update',
        old_value: task.status,
        new_value: status || `Updated task "${task.action_title}"`,
        change_reason: `Task update: ${status ? 'Status changed' : 'Details updated'}`
    });

    // If status changed and user is not admin/risk_manager, notify the risk manager
    if (status && status !== task.status && role === 'user') {
        try {
            // Get risk details
            const riskDetails = await query(
                'SELECT risk_id, risk_code, statement, owner_user_id FROM risks WHERE risk_id = $1',
                [task.risk_id]
            );

            if (riskDetails.rows.length > 0) {
                const risk = riskDetails.rows[0];
                const userDetails = await query('SELECT full_name FROM users WHERE user_id = $1', [userId]);
                const userName = userDetails.rows[0]?.full_name || 'User';

                // Notify risk owner/manager
                if (risk.owner_user_id) {
                    await query(
                        `INSERT INTO notifications (tenant_id, user_id, message, read, type, risk_id, created_at)
                         VALUES ($1, $2, $3, false, 'STATUS_CHANGE', $4, CURRENT_TIMESTAMP)`,
                        [
                            tenantId,
                            risk.owner_user_id,
                            `${userName} updated task "${task.action_title}" to ${status} for risk "${risk.statement}"${risk.risk_code ? ` (${risk.risk_code})` : ''}`,
                            risk.risk_id
                        ]
                    );
                    logger.info(`Created status change notification for risk owner ${risk.owner_user_id}`);
                }
            }
        } catch (error) {
            logger.error('Failed to create status change notification:', error);
            // Don't throw - notification failure shouldn't block task update
        }
    }

    res.json(updatedPlan);
}));

/**
 * Suggest remediation plans using AI
 * POST /api/v1/remediation/suggest
 */
router.post('/suggest', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { risk_id: inputRiskId } = req.body;

    if (!inputRiskId) {
        throw new AppError('Risk ID is required', 400);
    }

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = inputRiskId;

    if (!uuidRegex.test(inputRiskId)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [inputRiskId, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    }

    // Fetch risk details
    const riskResult = await query(
        'SELECT * FROM risks WHERE risk_id = $1 AND tenant_id = $2',
        [resolvedRiskId, tenantId]
    );

    if (riskResult.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const risk = riskResult.rows[0];

    // Fetch current controls
    const controlsResult = await query(
        `SELECT c.control_name, c.control_type, c.implementation_status 
         FROM controls c
         JOIN risk_control_mappings rcm ON c.control_id = rcm.control_id
         WHERE rcm.risk_id = $1`,
        [resolvedRiskId]
    );

    // Call AI Service
    // Note: We are importing this dynamically to avoid circular dependencies if any
    const { suggestRemediation } = await import('../services/ai.service');
    const suggestions = await suggestRemediation(risk, controlsResult.rows);

    res.json(suggestions);

    // Audit log
    const { userId } = req.user!;
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'REMEDIATION_SUGGESTION',
        entity_id: resolvedRiskId,
        action: 'GENERATE_AI_SUGGESTIONS',
        actor_user_id: userId,
        changes: { risk_id: resolvedRiskId }
    });
}));

export default router;
