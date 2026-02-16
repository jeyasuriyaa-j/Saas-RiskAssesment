import { Router, Response } from 'express';
import { query } from '../database/connection';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/frameworks', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    const result = await query(
        'SELECT * FROM compliance_frameworks WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY framework_name',
        [tenantId]
    );

    res.json(result.rows);
}));

/**
 * Create a custom compliance framework
 * POST /api/v1/compliance/frameworks
 */
router.post('/frameworks', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { framework_name } = req.body;

    if (!framework_name) {
        throw new AppError('Framework name is required', 400);
    }

    const result = await query(
        'INSERT INTO compliance_frameworks (tenant_id, framework_name, enabled) VALUES ($1, $2, $3) RETURNING *',
        [tenantId, framework_name, true]
    );

    res.status(201).json(result.rows[0]);
}));

/**
 * Get clauses for a framework
 * GET /api/v1/compliance/frameworks/:frameworkId/clauses
 */
router.get('/frameworks/:frameworkId/clauses', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { frameworkId } = req.params;

    const result = await query(
        'SELECT * FROM compliance_clauses WHERE framework_id = $1 ORDER BY clause_number',
        [frameworkId]
    );

    res.json(result.rows);
}));

/**
 * Add a clause to a framework
 * POST /api/v1/compliance/frameworks/:frameworkId/clauses
 */
router.post('/frameworks/:frameworkId/clauses', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { frameworkId } = req.params;
    const { clause_number, clause_text, description } = req.body;

    // Verify framework belongs to tenant
    const fwCheck = await query(
        'SELECT * FROM compliance_frameworks WHERE framework_id = $1 AND tenant_id = $2',
        [frameworkId, tenantId]
    );

    if (fwCheck.rows.length === 0) {
        throw new AppError('Framework not found or unauthorized', 404);
    }

    const result = await query(
        `INSERT INTO compliance_clauses (framework_id, clause_number, clause_text, description) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [frameworkId, clause_number, clause_text, description]
    );

    res.status(201).json(result.rows[0]);
}));

/**
 * Get risk mappings for compliance
 * GET /api/v1/compliance/risks/:riskId/mappings
 */
router.get('/risks/:riskId/mappings', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { riskId } = req.params;

    const result = await query(
        `SELECT rrm.*, cc.clause_number, cc.clause_text, cf.framework_name
         FROM risk_regulation_mappings rrm
         JOIN compliance_clauses cc ON rrm.clause_id = cc.clause_id
         JOIN compliance_frameworks cf ON cc.framework_id = cf.framework_id
         WHERE rrm.risk_id = $1 AND rrm.tenant_id = $2`,
        [riskId, tenantId]
    );

    res.json(result.rows);
}));

/**
 * Create or update risk-compliance mapping
 * POST /api/v1/compliance/mappings
 */
router.post('/mappings', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { risk_id, clause_id, exposure_level, confidence_score, mapped_by } = req.body;

    if (!risk_id || !clause_id) {
        throw new AppError('Risk ID and Clause ID are required', 400);
    }

    const result = await query(
        `INSERT INTO risk_regulation_mappings (
            tenant_id, risk_id, clause_id, exposure_level, confidence_score, mapped_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (risk_id, clause_id) DO UPDATE SET
            exposure_level = EXCLUDED.exposure_level,
            confidence_score = EXCLUDED.confidence_score,
            mapped_by = EXCLUDED.mapped_by
        RETURNING *`,
        [tenantId, risk_id, clause_id, exposure_level || 'MEDIUM', confidence_score || 0, mapped_by || 'MANUAL']
    );

    res.status(201).json(result.rows[0]);
}));

/**
 * Toggle compliance framework status
 * PATCH /api/v1/compliance/frameworks/:frameworkId
 */
router.patch('/frameworks/:frameworkId', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { frameworkId } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
        throw new AppError('Enabled status is required', 400);
    }

    const result = await query(
        `UPDATE compliance_frameworks 
         SET enabled = $1 
         WHERE framework_id = $2 AND tenant_id = $3
         RETURNING *`,
        [enabled, frameworkId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Framework not found', 404);
    }

    res.json(result.rows[0]);
}));

/**
 * Get Compliance Dashboard Summary
 * GET /api/v1/compliance/dashboard
 */
router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    // Get all enabled frameworks for tenant
    const frameworksResult = await query(
        'SELECT * FROM compliance_frameworks WHERE tenant_id = $1 AND enabled = true',
        [tenantId]
    );

    const summary = await Promise.all(frameworksResult.rows.map(async (fw: any) => {
        // Get clause coverage and exposure
        const stats = await query(
            `SELECT 
                COUNT(DISTINCT cc.clause_id) as total_clauses,
                COUNT(DISTINCT rrm.clause_id) as mapped_clauses,
                COALESCE(SUM(CASE WHEN rrm.exposure_level = 'HIGH' THEN 1 ELSE 0 END), 0) as high_exposure
             FROM compliance_clauses cc
             LEFT JOIN risk_regulation_mappings rrm ON cc.clause_id = rrm.clause_id AND rrm.tenant_id = $1
             WHERE cc.framework_id = $2`,
            [tenantId, fw.framework_id]
        );

        return {
            framework_id: fw.framework_id,
            framework_name: fw.framework_name,
            total_clauses: parseInt(stats.rows[0].total_clauses),
            mapped_clauses: parseInt(stats.rows[0].mapped_clauses),
            high_exposure_count: parseInt(stats.rows[0].high_exposure),
            coverage_percentage: stats.rows[0].total_clauses > 0
                ? (stats.rows[0].mapped_clauses / stats.rows[0].total_clauses) * 100
                : 0
        };
    }));

    res.json(summary);
}));

/**
 * Update control effectiveness assessment
 * PATCH /api/v1/compliance/controls/:controlId/effectiveness
 */
router.patch('/controls/:controlId/effectiveness', authorize('admin', 'risk_manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { controlId } = req.params;
    const { effectiveness_score, assessment_notes } = req.body;

    if (effectiveness_score === undefined) {
        throw new AppError('Effectiveness score is required', 400);
    }

    const result = await query(
        `UPDATE controls 
         SET effectiveness_score = $1, 
             assessment_notes = $2,
             last_assessed_at = NOW()
         WHERE control_id = $3 AND tenant_id = $4
         RETURNING *`,
        [effectiveness_score, assessment_notes, controlId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Control not found', 404);
    }

    res.json(result.rows[0]);
}));

export default router;
