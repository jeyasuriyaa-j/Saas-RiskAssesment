import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { processControlEffectiveness } from '../services/ai.service';
import { auditService } from '../services/audit.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all controls for tenant
 * GET /api/v1/controls
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const {
        implementation_status,
        control_type,
        page = 1,
        limit = 20
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['tenant_id = $1'];
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (implementation_status) {
        whereConditions.push(`implementation_status = $${paramIndex}`);
        params.push(implementation_status);
        paramIndex++;
    }

    if (control_type) {
        whereConditions.push(`control_type = $${paramIndex}`);
        params.push(control_type);
        paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
        `SELECT COUNT(*) as total FROM controls WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
        `SELECT * FROM controls 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
    );

    res.json({
        page: Number(page),
        limit: Number(limit),
        total,
        controls: result.rows
    });
}));

/**
 * Create new control (Admin and Risk Manager only)
 * POST /api/v1/controls
 */
router.post('/', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const {
        control_name,
        description,
        control_type,
        implementation_status,
        owner_user_id
    } = req.body;

    if (!control_name) {
        throw new AppError('Control name is required', 400);
    }

    const result = await query(
        `INSERT INTO controls (
            tenant_id, control_name, description, control_type, 
            implementation_status, owner_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            tenantId,
            control_name,
            description || null,
            control_type || 'PREVENTIVE',
            implementation_status || 'DESIGNED',
            owner_user_id || userId
        ]
    );

    const newControl = result.rows[0];
    logger.info(`Control created: ${newControl.control_id} by user ${userId}`);

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'CONTROL',
        entity_id: newControl.control_id,
        action: 'CREATE',
        actor_user_id: userId,
        changes: newControl
    });

    res.status(201).json(newControl);
}));

/**
 * Get control by ID
 * GET /api/v1/controls/:controlId
 */
router.get('/:controlId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { controlId } = req.params;

    const result = await query(
        'SELECT * FROM controls WHERE control_id = $1 AND tenant_id = $2',
        [controlId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Control not found', 404);
    }

    res.json(result.rows[0]);
}));

/**
 * Update control (Admin and Risk Manager only)
 * PUT /api/v1/controls/:controlId
 */
router.put('/:controlId', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { controlId } = req.params;
    const {
        control_name,
        description,
        control_type,
        implementation_status,
        implementation_percent,
        effectiveness_percent,
        owner_user_id
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fields = {
        control_name, description, control_type,
        implementation_status, implementation_percent,
        effectiveness_percent, owner_user_id
    };

    Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
            updates.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        }
    });

    if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
    }

    params.push(controlId, tenantId);
    const result = await query(
        `UPDATE controls SET ${updates.join(', ')} 
         WHERE control_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        params
    );

    if (result.rows.length === 0) {
        throw new AppError('Control not found or access denied', 404);
    }

    logger.info(`Control updated: ${controlId} by user ${userId}`);

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'CONTROL',
        entity_id: controlId,
        action: 'UPDATE',
        actor_user_id: userId,
        changes: fields
    });

    res.json(result.rows[0]);
}));

/**
 * Delete control (Admin and Risk Manager only)
 * DELETE /api/v1/controls/:controlId
 */
router.delete('/:controlId', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { controlId } = req.params;

    const result = await query(
        'DELETE FROM controls WHERE control_id = $1 AND tenant_id = $2 RETURNING control_id',
        [controlId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Control not found', 404);
    }

    logger.info(`Control deleted: ${controlId} by user ${userId}`);

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'CONTROL',
        entity_id: controlId,
        action: 'DELETE',
        actor_user_id: userId,
        changes: { control_id: controlId }
    });

    res.status(204).send();
}));

/**
 * Assign control to risk (Admin and Risk Manager only)
 * POST /api/v1/risks/:riskId/assign
 */
router.post('/risks/:riskId/assign', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const { riskId: paramRiskId } = req.params;
    const { control_id, mitigation_strength, controls_what_percent } = req.body;

    if (!control_id) {
        throw new AppError('Control ID is required', 400);
    }

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = paramRiskId;

    if (!uuidRegex.test(paramRiskId)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [paramRiskId, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    }

    const strengthMap: Record<string, string> = {
        'low': 'WEAK',
        'medium': 'MODERATE',
        'high': 'STRONG',
        'weak': 'WEAK',
        'moderate': 'MODERATE',
        'strong': 'STRONG'
    };

    const normalizedStrength = (mitigation_strength || '').toString().toLowerCase();
    const finalStrength = strengthMap[normalizedStrength] || 'MODERATE';

    const result = await query(
        `INSERT INTO risk_control_mappings (
            tenant_id, risk_id, control_id, mitigation_strength, controls_what_percent
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (risk_id, control_id) DO UPDATE SET
            mitigation_strength = EXCLUDED.mitigation_strength,
            controls_what_percent = EXCLUDED.controls_what_percent
        RETURNING *`,
        [tenantId, resolvedRiskId, control_id, finalStrength, controls_what_percent || 0]
    );

    const mapping = result.rows[0];

    // Audit log
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'CONTROL_MAPPING',
        entity_id: `${resolvedRiskId}:${control_id}`,
        action: 'ASSIGN',
        actor_user_id: userId,
        changes: {
            risk_id: resolvedRiskId,
            control_id: control_id,
            mitigation_strength: finalStrength,
            controls_what_percent: controls_what_percent || 0
        }
    });

    res.status(201).json(mapping);
}));

/**
 * Trigger AI Control Effectiveness Assessment
 * POST /api/v1/controls/risks/:riskId/assess-effectiveness
 */
router.get('/risks/:riskId/assess-effectiveness', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId: paramRiskId } = req.params;
    const { prompt_id } = req.query;

    // Resolve risk_id if it's a code
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedRiskId = paramRiskId;

    if (!uuidRegex.test(paramRiskId)) {
        const riskLookup = await query(
            `SELECT risk_id FROM risks WHERE risk_code = $1 AND tenant_id = $2`,
            [paramRiskId, tenantId]
        );
        if (riskLookup.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }
        resolvedRiskId = riskLookup.rows[0].risk_id;
    } else {
        // Verify existence if it looks like a UUID
        const riskResult = await query(
            'SELECT risk_id FROM risks WHERE risk_id = $1 AND tenant_id = $2',
            [resolvedRiskId, tenantId]
        );
        if (riskResult.rows.length === 0) {
            throw new AppError('Risk not found', 404);
        }
    }

    // Create suggestion request
    const insertResult = await query(
        `INSERT INTO ai_suggestions (risk_id, tenant_id, prompt_id, status)
         VALUES ($1, $2, $3, 'PROCESSING')
         RETURNING request_id`,
        [resolvedRiskId, tenantId, prompt_id || 'PROMPT_V6.1']
    );

    const requestId = insertResult.rows[0].request_id;

    // Trigger AI process in background
    processControlEffectiveness(requestId, resolvedRiskId, tenantId);

    res.status(202).json({
        request_id: requestId,
        status: "PROCESSING"
    });

    // Audit log
    const { userId } = req.user!;
    await auditService.logAction({
        tenant_id: tenantId,
        entity_type: 'CONTROL_ASSESSMENT',
        entity_id: requestId,
        action: 'START_AI_ASSESSMENT',
        actor_user_id: userId,
        changes: { risk_id: resolvedRiskId, request_id: requestId }
    });
}));

export default router;
