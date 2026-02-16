import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest, USER_EDITABLE_RISK_FIELDS } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';
import { processRiskImprovement, processRiskScoring, processRiskAnalysis } from '../services/ai.service';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { triggerBulkImport } from './import.routes';
import { WorkflowService } from '../services/workflow.service';
import { NotificationService } from '../services/notification.service';
import { pool } from '../database/connection';

const notificationService = new NotificationService(pool as any);
const workflowService = new WorkflowService(pool as any, notificationService);

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all risks for tenant (Aligned with User Spec)
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const {
        page = 1,
        limit = 20,
        status,
        owner_id,
        department,
        min_score,
        sort_by = 'created_at',
        sort_order = 'desc',
        assigned_to_me
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build WHERE clause
    const role = req.user?.role;
    const userDeptId = req.user?.departmentId;
    const userId = req.user?.userId;

    // Start with base conditions (different for users vs admins/managers)
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    let needsRemediationJoin = false;

    // ENTERPRISE ISOLATION LOGIC
    // For users: can see risks in their tenant
    // For others: strict tenant filtering
    whereConditions.push(`r.tenant_id = $${paramIndex}`);
    params.push(tenantId);
    paramIndex++;

    // Handle assigned_to_me filter
    if (assigned_to_me === 'true') {
        needsRemediationJoin = true;
        whereConditions.push(`rp.owner_user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
    }

    if (status) {
        // Map SPEC status to DB status
        const dbStatus = String(status).toUpperCase();
        whereConditions.push(`r.status = $${paramIndex}`);
        params.push(dbStatus);
        paramIndex++;
    } else {
        // By default, exclude CLOSED risks, unless specifically requested or filtered
        whereConditions.push(`r.status != 'CLOSED'`);
    }

    if (owner_id) {
        whereConditions.push(`r.owner_user_id = $${paramIndex}`);
        params.push(owner_id);
        paramIndex++;
    }

    // Additional role-based filtering
    // 1. RISK MANAGER: Can only see risks in their Department (unless Admin)
    if (role === 'risk_manager') {
        if (userDeptId) {
            whereConditions.push(`r.department_id = $${paramIndex}`);
            params.push(userDeptId);
            paramIndex++;
        } else {
            // Fallback: If no dept assigned, maybe see none or their own? 
            // Sticking to strict: see their own created risks if no dept.
            whereConditions.push(`r.owner_user_id = $${paramIndex}`);
            params.push(userId);
            paramIndex++;
        }
    }
    // 2. USER: Already handled above with OR logic
    // 3. ADMIN: Sees all (no extra filter)

    // Optional frontend filter for department (if Admin wants to filter)
    if (department && role === 'admin') {
        whereConditions.push(`r.department = $${paramIndex}`);
        params.push(department);
        paramIndex++;
    }

    if (min_score) {
        whereConditions.push(`r.inherent_risk_score >= $${paramIndex}`);
        params.push(Number(min_score));
        paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const fromClause = needsRemediationJoin
        ? 'FROM risks r LEFT JOIN remediation_plans rp ON r.risk_id = rp.risk_id'
        : 'FROM risks r';

    // Get total count
    const countResult = await query(
        `SELECT COUNT(DISTINCT r.risk_id) as total ${fromClause} WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].total);

    // Sort column mapping
    const sortMapping: { [key: string]: string } = {
        'risk_score': 'inherent_risk_score',
        'created_at': 'created_at',
        'statement': 'statement'
    };
    const sortColumn = sortMapping[sort_by as string] || 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get risks with dynamic priority based on tenant appetite
    const risksResult = await query(
        `WITH appetite AS (
            SELECT risk_appetite_config FROM tenants WHERE tenant_id = $1
        ),
        scoring_scales AS (
            SELECT (value->'scales'->>'likelihood')::int as l_max, (value->'scales'->>'impact')::int as i_max
            FROM system_config WHERE key = 'scoring'
        )
        SELECT DISTINCT
            r.risk_id, r.risk_code, r.statement,
            r.likelihood_score, r.impact_score, r.inherent_risk_score,
            r.status, r.category as category_name,
            u.full_name as owner_name, r.created_at,
            CASE 
                WHEN r.inherent_risk_score >= COALESCE((a.risk_appetite_config->'thresholds'->>'critical')::int, 20) THEN 'CRITICAL'
                WHEN r.inherent_risk_score >= COALESCE((a.risk_appetite_config->'thresholds'->>'high')::int, 15) THEN 'HIGH'
                WHEN r.inherent_risk_score >= COALESCE((a.risk_appetite_config->'thresholds'->>'medium')::int, 10) THEN 'MEDIUM'
                ELSE 'LOW'
            END as priority
        ${fromClause}
        LEFT JOIN users u ON r.owner_user_id = u.user_id
        CROSS JOIN appetite a
        WHERE ${whereClause}
        ORDER BY r.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
    );

    // Response in User Spec Format
    res.json({
        page: Number(page),
        limit: Number(limit),
        total,
        risks: risksResult.rows
    });
}));

// Get single risk by ID (Aligned with User Spec)
router.get('/:riskId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;

    // Support both UUID and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'r.risk_id' : 'r.risk_code';

    // const { userId, role } = req.user!;

    // Build query with cross-tenant access for assigned users
    // Admins/Risk Managers can see all risks in their tenant
    // Users can see risks in their tenant OR risks they have assigned tasks for
    let query_text = `
        SELECT 
          r.*,
          r.category as category_name,
          u.full_name as owner_name
         FROM risks r
         LEFT JOIN users u ON r.owner_user_id = u.user_id
         WHERE ${idColumn} = $1 AND r.tenant_id = $2`;

    const params = [riskId, tenantId];

    const result = await query(query_text, params);

    if (result.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const risk = result.rows[0];

    // Get controls
    const controlsResult = await query(
        `SELECT c.control_id, c.control_name, c.control_code, c.control_type, 
                c.implementation_status, c.effectiveness_percent,
                rcm.mitigation_strength, rcm.controls_what_percent
         FROM controls c
         JOIN risk_control_mappings rcm ON c.control_id = rcm.control_id
         WHERE rcm.risk_id = $1`,
        [risk.risk_id]
    );

    // Get remediation plans
    const remediationResult = await query(
        `SELECT rp.*, u.full_name as owner_name 
         FROM remediation_plans rp
         LEFT JOIN users u ON rp.owner_user_id = u.user_id
         WHERE rp.risk_id = $1
         ORDER BY rp.created_at DESC`,
        [risk.risk_id]
    );

    // Get compliance mappings
    const complianceResult = await query(
        `SELECT 
      cf.framework_name as framework,
      cc.clause_number as clause,
      cc.clause_text
     FROM risk_regulation_mappings rrm
     JOIN compliance_clauses cc ON rrm.clause_id = cc.clause_id
     JOIN compliance_frameworks cf ON cc.framework_id = cf.framework_id
     WHERE rrm.risk_id = $1`,
        [risk.risk_id]
    );

    // Get history (audit trail) using the dedicated auditService
    const history = await auditService.getHistory(risk.risk_id, tenantId);

    // Format response for RiskDetail.tsx
    res.json({
        ...risk,
        risk_id: risk.risk_code,
        statement: risk.statement,
        likelihood_score: risk.likelihood_score || 0,
        impact_score: risk.impact_score || 0,
        inherent_risk_score: risk.inherent_risk_score || 0,
        controls: controlsResult.rows,
        remediation_plans: remediationResult.rows,
        compliance_mappings: complianceResult.rows,
        history: history.map((h: any) => ({
            ...h,
            history_id: h.history_id,
            changed_at: h.changed_at,
            change_type: h.change_type,
            changed_by_name: h.changed_by_name || 'System'
        })),
        audit_trail: history
    });
}));

// Get history for a specific risk
router.get('/:riskId/history', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;

    const history = await auditService.getHistory(riskId, tenantId);
    res.json(history);
}));

// Assign Risk (Enterprise Workflow)
router.post('/:id/assign', authorize('manager', 'admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { assignee_id, due_date } = req.body;
    const assignerId = req.user!.userId;

    // Check strict department ownership if manager
    if (req.user!.role === 'risk_manager') {
        // Ideally verify risk belongs to their department
        // For now trusting the UI filter + backend checks in service if implemented
    }

    const assignment = await workflowService.assignRisk(id, assignee_id, assignerId, due_date);

    // Get risk details for notification
    const riskResult = await query(
        'SELECT risk_id, risk_code, statement FROM risks WHERE risk_id = $1 OR risk_code = $1',
        [id]
    );

    if (riskResult.rows.length > 0) {
        const risk = riskResult.rows[0];
        const riskId = risk.risk_id;

        // Update risk with assignment tracking
        await query(
            'UPDATE risks SET assigned_to = $1, assigned_at = CURRENT_TIMESTAMP WHERE risk_id = $2',
            [assignee_id, riskId]
        );

        // Get assignee details
        const userResult = await query(
            'SELECT email, full_name FROM users WHERE user_id = $1',
            [assignee_id]
        );

        if (userResult.rows.length > 0) {
            const assignee = userResult.rows[0];

            // Create notification
            const { createRiskAssignmentNotification } = await import('../services/notification.service');
            await createRiskAssignmentNotification(req.user!.tenantId, assignee_id, riskId, risk.statement);

            // Send email notification
            try {
                const { sendEmail } = await import('../services/email.service');
                await sendEmail({
                    to: assignee.email,
                    subject: 'New Risk Assigned',
                    text: `You have been assigned to risk: ${risk.statement} (${risk.risk_code})\n\nView details: ${process.env.FRONTEND_URL}/risks/${risk.risk_code}`,
                    html: `
                        <h2>New Risk Assignment</h2>
                        <p>You have been assigned to the following risk:</p>
                        <p><strong>${risk.statement}</strong></p>
                        <p>Risk Code: ${risk.risk_code}</p>
                        <p><a href="${process.env.FRONTEND_URL}/risks/${risk.risk_code}">View Risk Details</a></p>
                    `
                });
            } catch (emailError) {
                logger.warn('Failed to send assignment email:', emailError);
                // Don't fail the request if email fails
            }
        }
    }

    // Log audit
    await auditService.logAction({
        tenant_id: req.user!.tenantId,
        entity_type: 'risks',
        entity_id: id,
        action: 'ASSIGN',
        actor_user_id: req.user!.userId,
        actor_name: req.user!.email,
        changes: { assignee_id, due_date }
    });

    res.json({ success: true, assignment });
}));

// Analyze a single risk using AI (Prompt V9.2)
router.post('/:riskId/analyze', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;
    const { force = false } = req.body;

    logger.info(`AI Analysis requested for risk ${riskId} (Tenant: ${tenantId}, Force: ${force})`);

    const analysis = await processRiskAnalysis(riskId, tenantId, force);

    // Audit the analysis
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'risks',
        entity_id: riskId,
        action: 'AI_ANALYSIS',
        actor_user_id: req.user!.userId,
        actor_name: req.user!.email,
        changes: { force }
    });

    res.json({ success: true, analysis });
}));

// Analyze Risk Correlations (Prompt V2.5)
router.post('/analyze-correlations', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskIds } = req.body;

    // Dynamically import to ensure circular dependencies don't break
    const { analyzeRiskCorrelations } = await import('../services/ai.service');

    logger.info(`Analyzing correlations for tenant ${tenantId} (${riskIds ? riskIds.length : 'all'} risks)`);

    const analysis = await analyzeRiskCorrelations(riskIds, tenantId);

    res.json(analysis);
}));

// Create new risk (Admin and Risk Manager only)
router.post('/', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const {
        statement,
        category,
        owner_id,
        causes,
        impacts,
        status: inputStatus,
        review_cycle_days,
        custom_fields: inputCustomFields,
        likelihood_score,
        impact_score
    } = req.body;

    // Validation
    if (!statement) {
        throw new AppError('Risk statement (title) is required', 400);
    }

    // Generate risk code or use provided one
    let risk_code = req.body.risk_code;
    if (!risk_code) {
        const codeResult = await query(
            `SELECT COUNT(*) as count FROM risks WHERE tenant_id = $1`,
            [tenantId]
        );
        const riskNumber = parseInt(codeResult.rows[0].count) + 1;
        risk_code = `RISK-${new Date().getFullYear()}-${String(riskNumber).padStart(3, '0')}`;
    }

    // Prepare custom fields
    const custom_fields = {
        ...(inputCustomFields || {}),
        causes,
        impacts,
        review_cycle_days,
        original_status: inputStatus
    };

    // Calculate inherent risk score
    const inherent_risk_score = (likelihood_score && impact_score) ? (likelihood_score * impact_score) : null;

    // Insert risk
    const result = await query(
        `INSERT INTO risks (
      tenant_id, risk_code, statement, category,
      owner_user_id, status, identified_date, custom_fields, created_by,
      likelihood_score, impact_score, inherent_risk_score, department_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
        [
            tenantId,
            risk_code,
            statement,
            category || null,
            owner_id || userId,
            'DRAFT',
            new Date(),
            JSON.stringify(custom_fields),
            userId,
            likelihood_score || null,
            impact_score || null,
            inherent_risk_score,
            req.user!.departmentId // Add department_id here
        ]
    );

    const newRisk = result.rows[0];

    // Log to audit history
    await auditService.logChange({
        risk_id: newRisk.risk_id,
        changed_by: userId,
        change_type: 'created',
        change_reason: 'Risk manually created',
        new_value: JSON.stringify(newRisk)
    });

    logger.info(`Risk created: ${risk_code} by user ${userId}`);

    // Global Audit log Entry
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'RISK',
        entity_id: newRisk.risk_id,
        action: 'CREATE',
        actor_user_id: userId,
        changes: newRisk
    });

    // Return response in user's specified format + nested for frontend
    res.status(201).json({
        risk: {
            ...newRisk,
            risk_id: newRisk.risk_code,
        },
        risk_id: newRisk.risk_code,
        created_at: newRisk.created_at,
        status: "DRAFT"
    });
}));

// Update risk (Role-based field restrictions)
router.put('/:riskId', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId, role } = req.user!;
    const { riskId } = req.params;

    // Role-based field restrictions: Users can only edit limited fields
    if (role === 'user') {
        const requestedFields = Object.keys(req.body);
        const forbiddenFields = requestedFields.filter(f => !USER_EDITABLE_RISK_FIELDS.includes(f));

        if (forbiddenFields.length > 0) {
            throw new AppError(`Users cannot modify these fields: ${forbiddenFields.join(', ')}. Only ${USER_EDITABLE_RISK_FIELDS.join(', ')} are allowed.`, 403);
        }
    }

    const {
        likelihood_score,
        impact_score,
        status: inputStatus,
        statement,
        category,
        priority,
        owner_user_id,
        department,
        comment,
        notes,
        user_notes
    } = req.body;

    // Support both UUID and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'risk_id' : 'risk_code';

    // Get current risk state for change tracking
    const currentResult = await query(
        `SELECT * FROM risks WHERE ${idColumn} = $1 AND tenant_id = $2`,
        [riskId, tenantId]
    );

    if (currentResult.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const currentRisk = currentResult.rows[0];

    // Track changes
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    const changes_tracked: any = {};

    if (likelihood_score !== undefined && likelihood_score !== currentRisk.likelihood_score) {
        updates.push(`likelihood_score = $${paramIndex}`);
        params.push(likelihood_score);
        changes_tracked.likelihood_score = { old: currentRisk.likelihood_score, new: likelihood_score };
        paramIndex++;
    }

    if (impact_score !== undefined && impact_score !== currentRisk.impact_score) {
        updates.push(`impact_score = $${paramIndex}`);
        params.push(impact_score);
        changes_tracked.impact_score = { old: currentRisk.impact_score, new: impact_score };
        paramIndex++;
    }

    if (inputStatus !== undefined && inputStatus !== currentRisk.status) {
        updates.push(`status = $${paramIndex}`);
        params.push(String(inputStatus).toUpperCase());
        changes_tracked.status = { old: currentRisk.status, new: String(inputStatus).toUpperCase() };
        paramIndex++;
    }

    if (statement !== undefined && statement !== currentRisk.statement) {
        updates.push(`statement = $${paramIndex}`);
        params.push(statement);
        changes_tracked.statement = { old: currentRisk.statement, new: statement };
        paramIndex++;
    }


    if (category !== undefined && category !== currentRisk.category) {
        updates.push(`category = $${paramIndex}`);
        params.push(category);
        changes_tracked.category = { old: currentRisk.category, new: category };
        paramIndex++;
    }

    if (priority !== undefined && priority !== currentRisk.priority) {
        updates.push(`priority = $${paramIndex}`);
        params.push(String(priority).toLowerCase());
        changes_tracked.priority = { old: currentRisk.priority, new: String(priority).toLowerCase() };
        paramIndex++;
    }

    if (department !== undefined && department !== currentRisk.department) {
        updates.push(`department = $${paramIndex}`);
        params.push(department);
        changes_tracked.department = { old: currentRisk.department, new: department };
        paramIndex++;
    }

    if (owner_user_id !== undefined && owner_user_id !== currentRisk.owner_user_id) {
        updates.push(`owner_user_id = $${paramIndex}`);
        params.push(owner_user_id);
        changes_tracked.owner_user_id = { old: currentRisk.owner_user_id, new: owner_user_id };
        paramIndex++;
    }

    // Handle user-editable fields (stored in custom_fields JSONB)
    const userEditableUpdates: Record<string, any> = {};
    if (comment !== undefined) {
        userEditableUpdates.comment = comment;
    }
    if (notes !== undefined) {
        userEditableUpdates.notes = notes;
    }
    if (user_notes !== undefined) {
        userEditableUpdates.user_notes = user_notes;
    }

    if (Object.keys(userEditableUpdates).length > 0) {
        // Merge with existing custom_fields
        const existingCustomFields = currentRisk.custom_fields || {};
        const mergedCustomFields = { ...existingCustomFields, ...userEditableUpdates };
        updates.push(`custom_fields = $${paramIndex}`);
        params.push(JSON.stringify(mergedCustomFields));
        changes_tracked.custom_fields = { old: existingCustomFields, new: mergedCustomFields };
        paramIndex++;
    }

    if (updates.length === 0) {
        res.json({
            risk_id: currentRisk.risk_code,
            updated_at: currentRisk.updated_at,
            message: 'No changes detected',
            changes_tracked: {}
        });
        return;
    }

    // Always recalculate inherent score if likelihood or impact changed
    if (changes_tracked.likelihood_score || changes_tracked.impact_score) {
        const newL = likelihood_score !== undefined ? likelihood_score : currentRisk.likelihood_score;
        const newI = impact_score !== undefined ? impact_score : currentRisk.impact_score;
        const newScore = (newL && newI) ? (newL * newI) : null;

        updates.push(`inherent_risk_score = $${paramIndex}`);
        params.push(newScore);
        changes_tracked.inherent_risk_score = { old: currentRisk.inherent_risk_score, new: newScore };
        paramIndex++;
    }

    // Add WHERE clause parameters
    params.push(currentRisk.risk_id, tenantId);

    const result = await query(
        `UPDATE risks 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE risk_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
        params
    );

    const updatedRisk = result.rows[0];

    // Log to audit history with BEFORE & AFTER
    await auditService.logChange({
        risk_id: updatedRisk.risk_id,
        changed_by: userId,
        change_type: 'updated',
        change_reason: 'Risk manually updated',
        old_value: JSON.stringify(currentRisk),
        new_value: JSON.stringify(updatedRisk)
    });

    logger.info(`Risk updated: ${updatedRisk.risk_code} by user ${userId}`);

    // Global Audit log Entry
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'RISK',
        entity_id: updatedRisk.risk_id,
        action: 'UPDATE',
        actor_user_id: userId,
        changes: changes_tracked
    });

    res.json({
        risk_id: updatedRisk.risk_code,
        updated_at: updatedRisk.updated_at,
        changes_tracked
    });

    // Send email to owner if status changed
    if (changes_tracked.status) {
        try {
            // Get owner details
            const ownerResult = await query(
                'SELECT full_name, email FROM users WHERE user_id = $1',
                [updatedRisk.owner_user_id]
            );

            // Get updater name
            const updaterResult = await query(
                'SELECT full_name FROM users WHERE user_id = $1',
                [userId]
            );

            if (ownerResult.rows.length > 0) {
                const owner = ownerResult.rows[0];
                const updaterName = updaterResult.rows[0]?.full_name || 'System';

                // Don't email if user updated their own risk
                if (updatedRisk.owner_user_id !== userId) {
                    await emailService.sendRiskUpdate({
                        ownerEmail: owner.email,
                        ownerName: owner.full_name,
                        riskCode: updatedRisk.risk_code,
                        riskStatement: updatedRisk.statement,
                        oldStatus: changes_tracked.status.old,
                        newStatus: changes_tracked.status.new,
                        updatedBy: updaterName
                    });
                }
            }
        } catch (err) {
            logger.error('Failed to send risk status update email', err);
        }
    }
}));

// Delete risk (Admin and Risk Manager only)
router.delete('/:riskId', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { riskId } = req.params;
    const { permanent } = req.query;

    // Support both UUID and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'risk_id' : 'risk_code';

    if (String(permanent) === 'true') {
        const result = await query(
            `DELETE FROM risks 
             WHERE ${idColumn} = $1 AND tenant_id = $2
             RETURNING risk_id, risk_code`,
            [riskId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }

        const { risk_id, risk_code } = result.rows[0];

        // Log permanent deletion using service
        await auditService.logAction({
            tenant_id: tenantId,
            entity_type: 'RISK',
            entity_id: risk_id,
            action: 'HARD_DELETE',
            actor_user_id: userId,
            changes: { action: 'PERMANENT_DELETE', risk_code }
        });

        logger.info(`Risk permanently deleted: ${risk_code} by user ${userId}`);
    } else {
        const result = await query(
            `UPDATE risks 
             SET status = 'CLOSED', closed_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
             WHERE ${idColumn} = $1 AND tenant_id = $2
             RETURNING risk_id, risk_code`,
            [riskId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }

        const { risk_id, risk_code } = result.rows[0];

        // Log soft deletion using service
        await auditService.logAction({
            tenant_id: tenantId,
            entity_type: 'RISK',
            entity_id: risk_id,
            action: 'DELETE',
            actor_user_id: userId,
            changes: { status: { old: 'ACTIVE', new: 'CLOSED' } }
        });

        logger.info(`Risk soft-deleted (closed): ${risk_code} by user ${userId}`);
    }

    res.status(204).send();
}));

// Bulk delete risks (Admin and Risk Manager only)
router.post('/bulk-delete', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { risk_ids, permanent } = req.body;

    // Validation
    if (!Array.isArray(risk_ids) || risk_ids.length === 0) {
        throw new AppError('risk_ids must be a non-empty array', 400);
    }

    if (risk_ids.length > 500) {
        throw new AppError('Cannot delete more than 500 risks at once', 400);
    }

    try {
        let result;
        const isPermanent = String(permanent) === 'true';
        if (isPermanent) {
            result = await query(
                `DELETE FROM risks 
                 WHERE risk_id = ANY($1::uuid[]) AND tenant_id = $2
                 RETURNING risk_id, risk_code`,
                [risk_ids, tenantId]
            );
            logger.info(`Bulk HARD delete: ${result.rows.length} risks permanently removed by user ${userId}`);
        } else {
            result = await query(
                `UPDATE risks 
                 SET status = 'CLOSED', closed_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
                 WHERE risk_id = ANY($1::uuid[]) AND tenant_id = $2
                 RETURNING risk_id, risk_code`,
                [risk_ids, tenantId]
            );
            logger.info(`Bulk SOFT delete: ${result.rows.length} risks closed by user ${userId}`);
        }

        const deletedCount = result.rows.length;
        const deletedRiskCodes = result.rows.map((r: any) => r.risk_code);

        // Individual Log entries for history
        const action = isPermanent ? 'HARD_DELETE' : 'DELETE';
        for (const row of result.rows) {
            await auditService.logAction({
                tenant_id: tenantId,
                entity_type: 'RISK',
                entity_id: row.risk_id,
                action: action,
                actor_user_id: userId,
                changes: { bulk: true, permanent: isPermanent }
            });
        }

        res.json({
            message: `Successfully processed ${deletedCount} risks`,
            deleted_count: deletedCount,
            deleted_risk_codes: deletedRiskCodes,
            failed_count: risk_ids.length - deletedCount
        });
    } catch (error: any) {
        logger.error(`Bulk delete failed for user ${userId}:`, error);
        throw new AppError(`Bulk delete failed: ${error.message}`, 500);
    }
}));

// Request Risk Improvement (Aligned with User Spec)
router.post('/:riskId/suggest-improvement', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { riskId } = req.params;
    const { prompt_id, raw_statement } = req.body;

    // Check risk existence
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId); // Fixed regex (removed extra {4}-)
    const idColumn = isUuid ? 'risk_id' : 'risk_code';
    const riskResult = await query(
        `SELECT risk_id, statement, description FROM risks WHERE ${idColumn} = $1 AND tenant_id = $2`,
        [riskId, tenantId]
    );

    if (riskResult.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const risk = riskResult.rows[0];
    const statementToImprove = raw_statement || risk.statement;

    // Create suggestion request
    const insertResult = await query(
        `INSERT INTO ai_suggestions (risk_id, tenant_id, prompt_id, status)
         VALUES ($1, $2, $3, 'PROCESSING')
         RETURNING request_id`,
        [risk.risk_id, tenantId, prompt_id]
    );

    const requestId = insertResult.rows[0].request_id;

    // Trigger AI process in background
    processRiskImprovement(requestId, risk.risk_id, statementToImprove, tenantId);

    res.status(202).json({
        request_id: requestId,
        status: "PROCESSING"
    });

    // Global Audit Log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'RISK_IMPROVEMENT',
        entity_id: requestId,
        action: 'START_AI_IMPROVEMENT',
        actor_user_id: userId,
        changes: { risk_id: risk.risk_id, request_id: requestId }
    });
}));

// Get Risk Improvement Suggestion (Aligned with User Spec)
router.get('/:riskId/suggestions/:requestId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { requestId } = req.params;

    const result = await query(
        `SELECT request_id, status, suggestion, user_action
         FROM ai_suggestions
         WHERE request_id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Suggestion request not found', 404);
    }

    const row = result.rows[0];

    res.json({
        request_id: row.request_id,
        status: row.status,
        suggestion: row.suggestion || null,
        user_action: row.user_action
    });
}));

// Update Suggestion Status (Feedback Loop - Sprint 5 Refinement)
router.patch('/:riskId/suggestions/:requestId', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { requestId } = req.params;
    const { action } = req.body; // 'ACCEPTED', 'REJECTED', 'MODIFIED'

    if (!['ACCEPTED', 'REJECTED', 'MODIFIED'].includes(action)) {
        throw new AppError('Invalid action. Must be ACCEPTED, REJECTED, or MODIFIED', 400);
    }

    const result = await query(
        `UPDATE ai_suggestions 
         SET user_action = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE request_id = $2 AND tenant_id = $3
         RETURNING request_id, user_action`,
        [action, requestId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Suggestion request not found', 404);
    }

    res.json({
        request_id: result.rows[0].request_id,
        user_action: result.rows[0].user_action,
        message: 'Feedback recorded'
    });

    // Global Audit Log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'AI_FEEDBACK',
        entity_id: requestId,
        action: 'SUBMIT_FEEDBACK',
        actor_user_id: userId,
        changes: { request_id: requestId, action: action }
    });
}));


// Request Risk Score (Aligned with User Spec)
router.post('/:riskId/suggest-score', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { riskId } = req.params;
    const { prompt_id, use_industry_benchmarks } = req.body;

    // Check risk existence
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId); // Fixed regex (removed extra {4}-)
    const idColumn = isUuid ? 'risk_id' : 'risk_code';
    const riskResult = await query(
        `SELECT risk_id, statement, description FROM risks WHERE ${idColumn} = $1 AND tenant_id = $2`,
        [riskId, tenantId]
    );

    if (riskResult.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const risk = riskResult.rows[0];

    // Create suggestion request
    const insertResult = await query(
        `INSERT INTO ai_suggestions (risk_id, tenant_id, prompt_id, status)
         VALUES ($1, $2, $3, 'PROCESSING')
         RETURNING request_id`,
        [risk.risk_id, tenantId, prompt_id]
    );

    const requestId = insertResult.rows[0].request_id;

    // Trigger AI process in background
    processRiskScoring(requestId, risk.risk_id, risk.statement, risk.description, tenantId, !!use_industry_benchmarks);

    res.status(202).json({
        request_id: requestId,
        status: "PROCESSING"
    });

    // Global Audit Log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'RISK_SCORING',
        entity_id: requestId,
        action: 'START_AI_SCORING',
        actor_user_id: userId,
        changes: { risk_id: risk.risk_id, request_id: requestId }
    });
}));

// Get Risk Score Suggestion (Aligned with User Spec)
router.get('/:riskId/score-suggestions/:requestId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { requestId } = req.params;

    const result = await query(
        `SELECT request_id, status, suggestion, user_action
         FROM ai_suggestions
         WHERE request_id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Suggestion request not found', 404);
    }

    const row = result.rows[0];

    res.json({
        suggestion: row.suggestion || null
    });
}));

// Bulk Import (Aligned with User Spec)
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.post('/bulk-import', authorize('admin', 'risk_manager'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { validation_level = 'STRICT', preview_only = false } = req.body;

    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    // Create job record
    const jobResult = await query(
        `INSERT INTO import_jobs (
            tenant_id, uploaded_by, file_name, file_path, file_size_bytes,
            status, validation_level, preview_only
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING job_id`,
        [tenantId, userId, req.file.originalname, req.file.path, req.file.size, 'PROCESSING', validation_level, preview_only === 'true' || preview_only === true]
    );

    const jobId = jobResult.rows[0].job_id;

    // Trigger background processing
    triggerBulkImport(jobId, req.file.path, tenantId, userId, validation_level, preview_only === 'true' || preview_only === true);

    res.status(202).json({
        import_job_id: jobId,
        status: "PROCESSING"
    });

    // Global Audit Log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'IMPORT',
        entity_id: jobId,
        action: 'START_BULK_UPLOAD',
        actor_user_id: userId,
        changes: { file_name: req.file.originalname, job_id: jobId }
    });
}));

/**
 * Get Risk Audit Trail (Aligned with User Spec)
 * GET /risks/{riskId}/audit-trail?limit=50&sort_order=DESC
 */
router.get('/:riskId/audit-trail', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;
    const { limit = 50, sort_order = 'DESC' } = req.query;

    // Support both UUID and risk_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId);
    const idColumn = isUuid ? 'risk_id' : 'risk_code';
    const riskResult = await query(
        `SELECT risk_id, risk_code FROM risks WHERE ${idColumn} = $1 AND tenant_id = $2`,
        [riskId, tenantId]
    );

    if (riskResult.rows.length === 0) {
        throw new AppError('Risk not found', 404);
    }

    const risk = riskResult.rows[0];

    // Fetch history
    const historyResult = await query(
        `SELECT 
            rh.history_id as entry_id,
            rh.changed_at as timestamp,
            rh.change_type as action,
            rh.changed_by as actor_id,
            rh.old_value,
            rh.new_value,
            rh.field_name
         FROM risk_history rh
         WHERE rh.risk_id = $1
         ORDER BY rh.changed_at ${sort_order === 'ASC' ? 'ASC' : 'DESC'}
         LIMIT $2`,
        [risk.risk_id, limit]
    );

    const audit_entries = historyResult.rows.map((row: any) => {
        let changes: Record<string, any> = {};

        if (row.action === 'updated') {
            try {
                changes = JSON.parse(row.new_value);
            } catch (e) {
                // Fallback for non-JSON or single field
                if (row.field_name) {
                    changes = { [row.field_name]: { old: row.old_value, new: row.new_value } };
                }
            }
        } else if (row.action === 'created') {
            try {
                const data = JSON.parse(row.new_value);
                // For created, everything is new
                Object.keys(data).forEach(key => {
                    changes[key] = { old: null, new: data[key] };
                });
            } catch (e) {
                changes = { risk: { old: null, new: 'Created' } };
            }
        } else if (row.action === 'deleted') {
            changes = { status: { old: 'ACTIVE', new: 'CLOSED' } };
        }

        return {
            entry_id: row.entry_id,
            timestamp: row.timestamp,
            action: row.action.toUpperCase(),
            actor_id: row.actor_id,
            changes
        };
    });

    res.json({
        risk_id: risk.risk_code,
        audit_entries
    });
}));

// Helper to handle AI response streaming (Future implementation)
// const streamAIResponse = async (res: Response, aiPromise: Promise<any>) => { ... };

/**
 * Analyze Correlations (Phase 2)
 */
router.post('/analyze-correlations', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskIds } = req.body; // Optional: specific risks to analyze

    // Fetch risks
    // Dynamically import to ensure circular dependencies don't break
    const { analyzeRiskCorrelations } = await import('../services/ai.service');

    logger.info(`Analyzing correlations for tenant ${tenantId} (${riskIds ? riskIds.length : 'all'} risks)`);

    const analysis = await analyzeRiskCorrelations(riskIds, tenantId);

    res.json(analysis);
}));

export default router;
