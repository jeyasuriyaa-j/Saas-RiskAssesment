import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { detectScaleDrift } from '../services/ai.service';

const router = Router();

router.use(authenticate);

// Trigger drift analysis
router.post('/analysis/drift', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    // Fetch all active risks for analysis
    const risksResult = await query(
        'SELECT * FROM risks WHERE tenant_id = $1 AND status != $2',
        [tenantId, 'CLOSED']
    );

    const risks = risksResult.rows;

    if (risks.length === 0) {
        return res.json({
            detected_outliers: [],
            drift_trends: [],
            justification_required: [],
            explanation: "No risks to analyze."
        });
    }

    const analysis = await detectScaleDrift(risks, tenantId);

    // Log the analysis for audit (optional but good practice)
    // await logAudit(...) // Skipped for brevity

    return res.json(analysis);
}));

// AI Learning Recommendations
router.get('/learning-recommendations', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { getLearningRecommendations } = require('../services/ai-learning.service');
    const recommendations = await getLearningRecommendations(tenantId);
    res.json({
        status: 'success',
        data: recommendations
    });
}));

/**
 * Get Risk Appetite Configuration
 */
router.get('/risk-appetite', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const result = await query(
        'SELECT risk_appetite_config FROM tenants WHERE tenant_id = $1',
        [tenantId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
    }

    const config = result.rows[0].risk_appetite_config || {
        thresholds: { critical: 80, high: 60, medium: 40, low: 20 },
        appetite_type: 'Balanced'
    };

    return res.json(config);
}));

/**
 * Update Risk Appetite Configuration
 */
router.put('/risk-appetite', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const config = req.body;

    await query(
        'UPDATE tenants SET risk_appetite_config = $1, updated_at = NOW() WHERE tenant_id = $2',
        [JSON.stringify(config), tenantId]
    );

    res.json({ success: true, config });
}));

/**
 * Get Simulation Portfolio Baseline
 */
router.get('/simulation/baseline', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    const result = await query(
        `SELECT 
            COUNT(*) as total_risks,
            AVG(likelihood_score * impact_score) as avg_inherent_score,
            SUM(likelihood_score * impact_score * (residual_risk_percent::float / 100)) as total_residual_impact
         FROM risks 
         WHERE tenant_id = $1 AND status != 'CLOSED'`,
        [tenantId]
    );

    res.json(result.rows[0]);
}));

// Calibrate Risk Appetite (Sprint 13)
router.post('/risk-appetite/calibrate', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;

    // Fetch all active risks
    const risksResult = await query(
        'SELECT inherent_risk_score FROM risks WHERE tenant_id = $1 AND status != $2',
        [tenantId, 'CLOSED']
    );

    const { calibrateRiskAppetite } = await import('../services/ai.service');
    const calibration = await calibrateRiskAppetite(risksResult.rows, tenantId);

    res.json(calibration);
}));

/**
 * Run Strategic Decision Simulation (Sprint 13)
 */
router.post('/simulation/run', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { scenario } = req.body;

    if (!scenario) {
        return res.status(400).json({ error: 'Scenario description is required' });
    }

    // Fetch active risks for context
    const risksResult = await query(
        'SELECT risk_id, risk_code, statement, category, inherent_risk_score FROM risks WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'ACTIVE']
    );

    if (risksResult.rows.length === 0) {
        return res.json({
            impacted_risks: [],
            new_risks_emerging: [],
            executive_summary: "No active risks to simulate against.",
            overall_risk_change: "NEUTRAL"
        });
    }

    const { simulateDecisionImpact } = await import('../services/ai.service');
    const simulation = await simulateDecisionImpact(scenario, risksResult.rows, tenantId);

    return res.json(simulation);
}));

export default router;
