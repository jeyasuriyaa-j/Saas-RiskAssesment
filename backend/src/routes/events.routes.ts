import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { processEventImpactAssessment } from '../services/ai.service';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all events for tenant
 * GET /api/v1/events
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const {
        event_type,
        severity,
        page = 1,
        limit = 20
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['tenant_id = $1'];
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (event_type) {
        whereConditions.push(`event_type = $${paramIndex}`);
        params.push(event_type);
        paramIndex++;
    }

    if (severity) {
        whereConditions.push(`severity = $${paramIndex}`);
        params.push(severity);
        paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
        `SELECT COUNT(*) as total FROM events WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
        `SELECT * FROM events 
         WHERE ${whereClause}
         ORDER BY occurred_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
    );

    res.json({
        page: Number(page),
        limit: Number(limit),
        total,
        events: result.rows
    });
}));

/**
 * Create new event/incident
 * POST /api/v1/events
 */
router.post('/', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId, userId } = req.user!;
    const {
        event_name,
        event_type,
        description,
        severity,
        occurred_at,
        affected_risk_ids
    } = req.body;

    if (!event_name) {
        throw new AppError('Event name is required', 400);
    }

    const result = await query(
        `INSERT INTO events (
            tenant_id, event_name, event_type, description, 
            severity, occurred_at, affected_risk_ids, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            tenantId,
            event_name,
            event_type || 'INCIDENT',
            description,
            severity || 'MEDIUM',
            occurred_at || new Date(),
            affected_risk_ids || [],
            userId
        ]
    );

    const newEvent = result.rows[0];
    logger.info(`Event created: ${newEvent.event_id} by user ${userId}`);

    res.status(201).json(newEvent);

    // Send email alert for Incidents
    if ((event_type || 'INCIDENT') === 'INCIDENT') {
        try {
            // Fetch risk managers and admins
            const recipientsResult = await query(
                `SELECT email FROM users WHERE tenant_id = $1 AND role IN ('admin', 'risk_manager') AND is_active = true`,
                [tenantId]
            );

            const recipients = recipientsResult.rows.map((r: any) => r.email);

            // Get reporter name
            const reporterResult = await query('SELECT full_name FROM users WHERE user_id = $1', [userId]);
            const reporterName = reporterResult.rows[0]?.full_name || 'Unknown User';

            await emailService.sendIncidentAlert({
                recipients,
                eventName: event_name,
                severity: severity || 'MEDIUM',
                description: description || 'No description provided.',
                occurredAt: occurred_at || new Date(),
                reportedBy: reporterName
            });
        } catch (err) {
            logger.error('Failed to send incident alert email', err);
        }
    }
}));

/**
 * Get events linked to a specific risk
 * GET /api/v1/events/by-risk/:riskId
 */
router.get('/by-risk/:riskId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;

    const result = await query(
        `SELECT event_id, event_name, event_type, severity, description, occurred_at, reported_at
         FROM events 
         WHERE tenant_id = $1 AND $2 = ANY(affected_risk_ids)
         ORDER BY occurred_at DESC`,
        [tenantId, riskId]
    );

    res.json({ events: result.rows });
}));

/**
 * Get event by ID
 * GET /api/v1/events/:eventId
 */
router.get('/:eventId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { eventId } = req.params;

    const result = await query(
        'SELECT * FROM events WHERE event_id = $1 AND tenant_id = $2',
        [eventId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Event not found', 404);
    }

    res.json(result.rows[0]);
}));

/**
 * Request Event Impact Assessment (Aligned with User Spec)
 * POST /api/v1/events/:eventId/assess-risk-impact
 */
router.post('/:eventId/assess-risk-impact', authorize('admin', 'risk_manager', 'user'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { eventId } = req.params;
    const { prompt_id, event_type, event_details } = req.body;

    // Check event existence
    let eventResult = await query(
        'SELECT event_id, event_type, description FROM events WHERE event_id = $1 AND tenant_id = $2',
        [eventId, tenantId]
    );

    if (eventResult.rows.length === 0) {
        throw new AppError('Event not found', 404);
    }

    const event = eventResult.rows[0];

    // Create suggestion request
    const insertResult = await query(
        `INSERT INTO ai_suggestions (event_id, tenant_id, prompt_id, status)
         VALUES ($1, $2, $3, 'PROCESSING')
         RETURNING request_id`,
        [eventId, tenantId, prompt_id || 'PROMPT_V5.1']
    );

    const requestId = insertResult.rows[0].request_id;

    // Trigger AI process in background
    processEventImpactAssessment(
        requestId,
        eventId,
        event_type || event.event_type,
        event_details || { description: event.description },
        tenantId
    );

    res.status(202).json({
        request_id: requestId,
        status: "PROCESSING"
    });
}));

/**
 * Get Event Risk Assessment (Aligned with User Spec)
 * GET /api/v1/events/:eventId/risk-assessments/:requestId
 */
router.get('/:eventId/risk-assessments/:requestId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { requestId } = req.params;

    const result = await query(
        `SELECT request_id, status, suggestion
         FROM ai_suggestions
         WHERE request_id = $1 AND tenant_id = $2`,
        [requestId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Assessment request not found', 404);
    }

    const row = result.rows[0];

    if (row.status === 'FAILED') {
        res.status(500).json({ status: 'FAILED', error: 'AI processing failed' });
        return;
    }

    if (row.status === 'PROCESSING') {
        res.status(200).json({ status: 'PROCESSING', request_id: row.request_id });
        return;
    }

    res.json({
        status: 'COMPLETED',
        suggestion: row.suggestion
    });
}));

export default router;
