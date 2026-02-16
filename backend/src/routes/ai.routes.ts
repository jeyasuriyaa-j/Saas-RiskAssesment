import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../database/connection';
import {
    suggestRiskScore,
    improveRiskDescription,
    recommendControls,
    detectRiskDuplicates,
    evaluateControlEffectiveness
} from '../services/ai.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Suggest risk scores (Prompt V1.3)
router.post('/suggest-score', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { risk_statement, risk_description } = req.body;

    const suggestion = await suggestRiskScore(
        risk_statement,
        risk_description,
        tenantId
    );

    res.json(suggestion);
}));

// Improve risk description (Prompt V1.2)
router.post('/improve-description', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { raw_risk } = req.body;

    const improved = await improveRiskDescription(raw_risk, tenantId);

    res.json(improved);
}));

// Recommend controls
router.post('/recommend-controls', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { risk_statement, risk_description, category } = req.body;

    const recommendations = await recommendControls(
        risk_statement,
        risk_description,
        category
    );

    res.json(recommendations);
}));

// Detect risk duplicates (Prompt V5.1)
router.post('/detect-duplicates', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { risks } = req.body; // Can optionally pass specific risks to check

    let risksToAnalyze = risks;
    if (!risksToAnalyze) {
        // Fetch all risks for the tenant if none provided
        const result = await query(
            'SELECT risk_id, risk_code, statement, description, owner_user_id, department FROM risks WHERE tenant_id = $1',
            [tenantId]
        );
        risksToAnalyze = result.rows;
    }

    const report = await detectRiskDuplicates(risksToAnalyze, tenantId);
    res.json(report);
}));

// Evaluate control effectiveness (Prompt V6.1)
router.post('/evaluate-effectiveness', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tenantId } = req.user!;
    const { risk_id } = req.body;

    if (!risk_id) {
        throw new Error('risk_id is required');
    }

    // Fetch risk details
    const riskResult = await query(
        'SELECT * FROM risks WHERE risk_id = $1 AND tenant_id = $2',
        [risk_id, tenantId]
    );

    if (riskResult.rows.length === 0) {
        res.status(404).json({ error: 'Risk not found' });
        return;
    }
    const risk = riskResult.rows[0];

    // Fetch associated controls
    const controlsResult = await query(
        `SELECT c.*, rc.mitigation_percentage 
         FROM controls c
         JOIN risk_controls rc ON c.control_id = rc.control_id
         WHERE rc.risk_id = $1`,
        [risk_id]
    );

    const report = await evaluateControlEffectiveness(risk, controlsResult.rows);
    res.json(report);
}));

export default router;
